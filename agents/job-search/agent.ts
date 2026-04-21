import Anthropic            from '@anthropic-ai/sdk';
import { saveJobs }         from '../../tools/storage.js';
import { logError }         from '../../tools/logger.js';
import { logAgentTool }     from '../../tools/logger.js';
import { createMockClient } from './agent.mock.js';
import { Job, SearchParams, AgentResult, Classification } from './types.js';

function getClient(searchParams: SearchParams): ReturnType<typeof createMockClient> | Anthropic {
  return process.env.AGENT_MODE === 'mock'
    ? createMockClient(searchParams)
    : new Anthropic();
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'evaluate_job',
    description: [
      'Evaluates ONE job posting and classifies it according to user criteria.',
      'Call this tool ONCE PER JOB. Do not evaluate the same job twice.'
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        id:             { type: 'string',
                          description: 'Exact value of the job id field (its URL)' },
        classification: { type: 'string',
                          enum: ['relevant', 'borderline', 'ignore'] },
        score:          { type: 'number',
                          description: 'relevant=7-10 | borderline=4-6 | ignore=1-3' },
        reason:         { type: 'string',
                          description: 'Maximum 80 characters explaining the classification' }
      },
      required: ['id', 'classification', 'score', 'reason']
    }
  },
  {
    name: 'save_relevant',
    description: [
      'Persists relevant job postings to disk.',
      'Call this tool ONCE at the end, after evaluating ALL job postings.',
      'Pass the complete array of jobs with classification=relevant.'
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          description: 'Array of complete job objects (originals from input)',
          items: { type: 'object' }
        }
      },
      required: ['jobs']
    }
  }
];

function buildSystemPrompt(searchParams: SearchParams): string {
  return [
    'You are an agent specialized in evaluating job postings.',
    '',
    'USER PROFILE:',
    `- Target role:      ${searchParams.role}`,
    `- Required stack:   ${(searchParams.stack ?? []).join(', ') || 'not specified'}`,
    `- Modality:         ${searchParams.remote ? 'remote only' : 'any'}`,
    `- Minimum salary:   ${searchParams.minSalary
        ? '$' + Number(searchParams.minSalary).toLocaleString() + ' USD'
        : 'not specified'}`,
    '',
    'CLASSIFICATION CRITERIA:',
    '- relevant   (score 7-10): meets 80%+ — stack matches, correct role, modality and salary OK.',
    '- borderline (score 4-6):  meets 50-79% — missing something relevant but worth considering.',
    '- ignore     (score 1-3):  meets <50% — different role, incompatible stack, or wrong modality.',
    '',
    'REQUIRED FLOW:',
    '1. Call evaluate_job ONCE for each job in the array.',
    '2. After evaluating ALL of them, call save_relevant with the relevant ones.',
    '3. Do not repeat evaluations. Do not skip jobs.'
  ].join('\n');
}

export async function runJobAgent(jobs: Job[], searchParams: SearchParams): Promise<AgentResult> {
  if (!jobs?.length) {
    return { relevant: [], borderline: [], ignored: [], totalEvaluated: 0 };
  }

  const client     = getClient(searchParams);
  const MAX_ITER   = 20;
  let   iterations = 0;

  const evaluations = new Map<string, { classification: Classification; score: number; reason: string }>();
  let   saved       = 0;
  const isMock      = process.env.AGENT_MODE === 'mock';

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: [{
      type: 'text',
      text: `Evaluate these ${jobs.length} job postings and save the relevant ones when done.\n\n` +
            `JOBS:\n${JSON.stringify(jobs, null, 2)}`
    }]
  }];

  const modeTag = isMock ? '🟡 [MOCK]' : '🔵 [REAL]';
  console.log(`\n${modeTag} Starting evaluation of ${jobs.length} job(s)...\n`);

  // ── AGENTIC LOOP ──────────────────────────────────────────────────────────
  while (iterations < MAX_ITER) {
    iterations++;

    const response = await (client as Anthropic).messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:     buildSystemPrompt(searchParams),
      tools:      TOOLS,
      messages
    });

    messages.push({ role: 'assistant', content: response.content });

    // ── stop_reason: end_turn ────────────────────────────────────────────
    if (response.stop_reason === 'end_turn') break;

    // ── stop_reason: max_tokens ──────────────────────────────────────────
    if (response.stop_reason === 'max_tokens') {
      logError('agent', new Error(`max_tokens at iteration ${iterations}`));
      break;
    }

    // ── stop_reason: tool_use ────────────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUseBlocks) {
        const input  = tu.input as Record<string, unknown>;
        const result = await executeTool(tu.name, input, jobs);

        logAgentTool(tu.name, input, result);

        if (tu.name === 'evaluate_job') {
          const classification = input.classification as Classification;
          const score          = input.score as number;
          const reason         = input.reason as string;
          const id             = input.id as string;
          const icon = { relevant: '✅', borderline: '🟡', ignore: '⬜' }[classification] ?? '❓';
          console.log(
            `  ${icon} [${String(score).padStart(2)}/10]`,
            classification.padEnd(10),
            `— ${reason}`
          );
          evaluations.set(id, { classification, score, reason });
        }

        if (tu.name === 'save_relevant') {
          const r = result as { added?: number };
          const inputJobs = (input.jobs as unknown[]) ?? [];
          saved = r.added ?? inputJobs.length;
        }

        toolResults.push({
          type:        'tool_result',
          tool_use_id: tu.id,
          content:     JSON.stringify(result)
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    logError('agent', new Error(`unexpected stop_reason: ${response.stop_reason}`));
    break;
  }

  if (iterations >= MAX_ITER) {
    logError('agent', new Error(`Iteration limit of ${MAX_ITER} reached`));
  }

  const relevant  = jobs.filter(j => evaluations.get(j.id)?.classification === 'relevant');
  const borderline = jobs.filter(j => evaluations.get(j.id)?.classification === 'borderline');
  const ignored   = jobs.filter(j => evaluations.get(j.id)?.classification === 'ignore');
  const noEval    = jobs.filter(j => !evaluations.has(j.id));

  if (noEval.length > 0) {
    logError('agent', new Error(`${noEval.length} job(s) not evaluated: ${noEval.map(j => j.id).join(', ')}`));
  }

  void saved; // used only for side-effect tracking

  return { relevant, borderline, ignored, totalEvaluated: evaluations.size };
}

// ── executeTool ─────────────────────────────────────────────────────────────
async function executeTool(
  name:    string,
  input:   Record<string, unknown>,
  allJobs: Job[]
): Promise<unknown> {
  if (name === 'evaluate_job') {
    const exists = allJobs.some(j => j.id === input.id);
    if (!exists) return { error: `id "${input.id}" not found in the original array` };
    return { ok: true, id: input.id, classification: input.classification };
  }

  if (name === 'save_relevant') {
    const result = saveJobs((input.jobs as Job[]) ?? []);
    return result;
  }

  return { error: `Unknown tool: ${name}` };
}
