import { SearchParams, Classification } from './types.js';

interface MockMessage {
  role:    string;
  content: unknown;
}

interface MockToolUseBlock {
  type:  'tool_use';
  id:    string;
  name:  string;
  input: Record<string, unknown>;
}

interface MockTextBlock {
  type: 'text';
  text: string;
}

interface MockResponse {
  stop_reason: 'tool_use' | 'end_turn';
  content:     (MockToolUseBlock | MockTextBlock)[];
  usage:       { input_tokens: number; output_tokens: number };
}

interface MockClient {
  messages: {
    create(params: { messages: MockMessage[] }): Promise<MockResponse>;
  };
}

export function createMockClient(searchParams: SearchParams): MockClient {
  let callCount = 0;
  const evaluations: { id: string; classification: Classification }[] = [];

  return {
    messages: {
      async create({ messages }: { messages: MockMessage[] }): Promise<MockResponse> {
        callCount++;

        // ── Call 1: evaluate all jobs ──────────────────────────────────
        if (callCount === 1) {
          const userContent = messages.find(m => m.role === 'user')?.content;
          const userText = Array.isArray(userContent)
            ? (userContent as { type?: string; text?: string }[]).find(b => b?.type === 'text')?.text ?? ''
            : String(userContent ?? '');

          const jsonMatch = userText.match(/JOBS:\n([\s\S]+)$/);
          let jobs: { id: string; title?: string; stack?: string[] }[] = [];
          try { jobs = JSON.parse(jsonMatch?.[1] ?? '[]'); } catch {}

          const roleWords = (searchParams.role ?? '')
            .toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const stackReq = (searchParams.stack ?? []).map(s => s.toLowerCase());

          const toolUseBlocks: MockToolUseBlock[] = jobs.map((job, i) => {
            const titleLower = (job.title ?? '').toLowerCase();
            const jobStack   = (job.stack ?? []).map(s => s.toLowerCase());

            const titleMatch = roleWords.filter(w => titleLower.includes(w)).length >= 2;
            const stackMatch = stackReq.some(s => jobStack.includes(s));

            let classification: Classification;
            let score: number;
            if (titleMatch && stackMatch)      { classification = 'relevant';   score = 8; }
            else if (titleMatch && !stackMatch) { classification = 'borderline'; score = 5; }
            else                               { classification = 'ignore';      score = 2; }

            const reason = classification === 'relevant'
              ? 'Title and stack match the profile'
              : classification === 'borderline'
              ? 'Title matches but stack does not fully align'
              : 'Role or stack does not match the target profile';

            evaluations.push({ id: job.id, classification });

            return {
              type:  'tool_use',
              id:    `mock_eval_${i}`,
              name:  'evaluate_job',
              input: { id: job.id, classification, score, reason }
            };
          });

          return {
            stop_reason: 'tool_use',
            content:     toolUseBlocks,
            usage:       { input_tokens: 0, output_tokens: 0 }
          };
        }

        // ── Call 2: save_relevant ──────────────────────────────────────
        if (callCount === 2) {
          const relevantIds = evaluations
            .filter(e => e.classification === 'relevant')
            .map(e => e.id);

          const userContent = messages.find(m => m.role === 'user')?.content;
          const userText = Array.isArray(userContent)
            ? (userContent as { type?: string; text?: string }[]).find(b => b?.type === 'text')?.text ?? ''
            : String(userContent ?? '');

          const jsonMatch = userText.match(/JOBS:\n([\s\S]+)$/);
          let originalJobs: { id: string }[] = [];
          try { originalJobs = JSON.parse(jsonMatch?.[1] ?? '[]'); } catch {}

          const relevantJobs = originalJobs.filter(j => relevantIds.includes(j.id));

          return {
            stop_reason: 'tool_use',
            content: [{
              type:  'tool_use',
              id:    'mock_save',
              name:  'save_relevant',
              input: { jobs: relevantJobs }
            }],
            usage: { input_tokens: 0, output_tokens: 0 }
          };
        }

        // ── Call 3+: end_turn ──────────────────────────────────────────
        return {
          stop_reason: 'end_turn',
          content: [{
            type: 'text',
            text: `[MOCK] Evaluation complete. ${evaluations.filter(e => e.classification === 'relevant').length} relevant jobs found.`
          }],
          usage: { input_tokens: 0, output_tokens: 0 }
        };
      }
    }
  };
}
