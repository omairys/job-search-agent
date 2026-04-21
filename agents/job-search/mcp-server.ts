import 'dotenv/config';
import { McpServer }            from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z }                    from 'zod';

import { fetchRemotive }                    from './sources/remotive.js';
// JA-004 pending: import { fetchLinkedIn } from './sources/linkedin.js'
import { runJobAgent }                      from './agent.js';
import { saveJobs, getNewJobs }             from '../../tools/storage.js';
import { notifyDiscord }                    from '../../notifications/discord.js';
import { logError }                         from '../../tools/logger.js';

const server = new McpServer({ name: 'job-search-agent', version: '1.0.0' });

// ── Tool 1: search_jobs ───────────────────────────────────────────────────
server.tool(
  'search_jobs',
  {
    role:     z.string().describe('Role to search for, e.g. "Frontend Engineer"'),
    location: z.string().default('Remote').describe('Location or "Remote"'),
    minScore: z.number().min(1).max(10).default(7).describe('Minimum Claude score (1-10)'),
    limit:    z.number().default(20).describe('Max jobs per source'),
  },
  async ({ role, location, minScore, limit }) => {
    const searchParams = { role, location, minScore, limit };

    const sourceTasks = [
      { name: 'remotive', fn: () => fetchRemotive(searchParams) },
      // JA-004: { name: 'linkedin', fn: () => fetchLinkedIn(searchParams) },
    ];

    const results = await Promise.allSettled(sourceTasks.map(s => s.fn()));

    let allJobs: Awaited<ReturnType<typeof fetchRemotive>> = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') allJobs.push(...r.value);
      else logError(sourceTasks[i].name, r.reason as Error);
    });

    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      if (seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });

    const agentResult = await runJobAgent(uniqueJobs, searchParams);

    saveJobs(agentResult.relevant);

    const summary = {
      totalEvaluated: agentResult.totalEvaluated,
      relevant:       agentResult.relevant.length,
      borderline:     agentResult.borderline.length,
      ignored:        agentResult.ignored.length,
    };

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ ok: true, summary, relevant: agentResult.relevant }, null, 2)
      }]
    };
  }
);

// ── Tool 2: list_saved_jobs ───────────────────────────────────────────────
server.tool(
  'list_saved_jobs',
  {},
  async () => {
    const jobs = getNewJobs();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ ok: true, total: jobs.length, jobs }, null, 2)
      }]
    };
  }
);

// ── Tool 3: notify ────────────────────────────────────────────────────────
server.tool(
  'notify',
  {
    channel: z.enum(['discord', 'email', 'both']).describe('Notification channel'),
    jobs:    z.array(z.object({
      title:    z.string(),
      company:  z.string(),
      url:      z.string(),
      score:    z.number(),
      source:   z.string(),
      location: z.string(),
    })).describe('Jobs to notify'),
  },
  async ({ channel, jobs }) => {
    const summary      = { totalEvaluated: jobs.length, relevant: jobs.length, borderline: 0, ignored: 0 };
    const searchParams = { role: 'Job Search Agent', minScore: 7 };

    if (channel === 'discord' || channel === 'both') {
      await notifyDiscord(jobs as Parameters<typeof notifyDiscord>[0], searchParams, summary);
    }

    if (channel === 'email' || channel === 'both') {
      try {
        // @ts-ignore — JA-008 pending: email.ts does not exist yet
        const { notifyEmail } = await import('../../notifications/email.js');
        await notifyEmail(jobs, searchParams, summary);
      } catch (e) {
        logError('mcp-notify-email', e as Error);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            ok: false, error: 'notifyEmail not available (JA-008 pending)'
          }) }]
        };
      }
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, channel, notified: jobs.length }) }]
    };
  }
);

// ── Tool 4: evaluate_job ──────────────────────────────────────────────────
server.tool(
  'evaluate_job',
  {
    job: z.object({
      title:       z.string(),
      company:     z.string(),
      description: z.string(),
      location:    z.string(),
      url:         z.string(),
      source:      z.string(),
      modality:    z.string().optional(),
      salary:      z.string().nullable().optional(),
      stack:       z.array(z.string()).optional(),
    }).describe('Job to evaluate (canonical project schema)'),
    minScore: z.number().default(7),
  },
  async ({ job, minScore }) => {
    const jobWithId = { id: job.url, ...job } as Parameters<typeof runJobAgent>[0][number];
    const result    = await runJobAgent([jobWithId], { minScore, role: job.title, location: job.location });
    const evaluated = result.relevant[0] ?? null;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ ok: true, relevant: !!evaluated, job: evaluated ?? jobWithId }, null, 2)
      }]
    };
  }
);

// ── Startup ───────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

console.error('✅ Job Search Agent MCP server started (stdio)');
