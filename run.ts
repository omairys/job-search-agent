import 'dotenv/config';
import { fetchRemotive }          from './sources/remotive.js';
// JA-004 pending: import { fetchLinkedIn }  from './sources/linkedin.js'
// JA-003 skipped: import { fetchGreenhouse } from './sources/greenhouse.js'
import { runJobAgent }            from './agent.js';
import { saveJobs, markAsSeen }   from './tools/storage.js';
import { notifyDiscord }          from './notifications/discord.js';
// JA-008 pending: import { notifyEmail } from './notifications/email.js'
import { logError, logAgentTool } from './tools/logger.js';

// ── CLI args parsing ──────────────────────────────────────────────────────
function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  const raw  = argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].startsWith('--') && raw[i + 1] !== undefined) {
      args[raw[i]] = raw[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const searchParams = {
  role:     args['--role']      ?? 'Software Engineer',
  location: args['--location']  ?? 'Remote',
  minScore: Number(args['--min-score'] ?? 7),
  limit:    Number(args['--limit']     ?? 20),
};

// ── Main orchestrator ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('\n🚀 Job Search Agent starting...');
  console.log(`🔍 Searching: "${searchParams.role}" | 📍 ${searchParams.location} | ⭐ Min score: ${searchParams.minScore}`);
  console.log('─'.repeat(60));

  // ── Step 2: Parallel fetch ──────────────────────────────────────────────
  const sourceTasks = [
    { name: 'remotive', fn: () => fetchRemotive(searchParams) },
    // JA-004: { name: 'linkedin',   fn: () => fetchLinkedIn(searchParams) },
    // JA-003: { name: 'greenhouse', fn: () => fetchGreenhouse(searchParams) },
  ];

  const results = await Promise.allSettled(sourceTasks.map(s => s.fn()));

  let allJobs: Awaited<ReturnType<typeof fetchRemotive>> = [];
  results.forEach((result, i) => {
    const { name } = sourceTasks[i];
    if (result.status === 'fulfilled') {
      console.log(`  ✅ ${name}: ${result.value.length} jobs`);
      allJobs.push(...result.value);
    } else {
      console.log(`  ❌ ${name}: failed (see logs)`);
      logError(name, result.reason as Error);
    }
  });

  // ── Step 3: Cross-source deduplication ─────────────────────────────────
  const seenUrls   = new Set<string>();
  const uniqueJobs = allJobs.filter(job => {
    if (seenUrls.has(job.url)) return false;
    seenUrls.add(job.url);
    return true;
  });

  const duplicatesRemoved = allJobs.length - uniqueJobs.length;
  console.log(`\n📦 ${allJobs.length} total jobs → ${uniqueJobs.length} unique` +
    (duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : ''));

  // ── Step 4: Evaluate with the agent ────────────────────────────────────
  console.log('\n🤖 Evaluating with Claude...');
  const agentResult = await runJobAgent(uniqueJobs, searchParams);

  const summary = {
    totalEvaluated: agentResult.totalEvaluated,
    relevant:       agentResult.relevant.length,
    borderline:     agentResult.borderline.length,
    ignored:        agentResult.ignored.length,
  };

  // ── Step 5: Persistence ─────────────────────────────────────────────────
  console.log(`\n💾 Saving ${agentResult.relevant.length} relevant jobs...`);
  saveJobs(agentResult.relevant);

  // ── Step 6: Evaluation summary ──────────────────────────────────────────
  console.log('\n📊 Evaluation summary:');
  console.log(`   Evaluated:  ${summary.totalEvaluated}`);
  console.log(`   Relevant:   ${summary.relevant}  ✅`);
  console.log(`   Borderline: ${summary.borderline}  🔶`);
  console.log(`   Ignored:    ${summary.ignored}   ❌`);

  logAgentTool('run-pipeline', { searchParams, uniqueJobs: uniqueJobs.length }, summary);

  // ── Step 7: Notifications ───────────────────────────────────────────────
  const notifyMode = process.env.NOTIFY ?? 'none';
  console.log('\n📨 Notifications...');

  if (notifyMode === 'discord' || notifyMode === 'both') {
    await notifyDiscord(agentResult.relevant, searchParams, summary);
    console.log('  📨 Discord: sent');
  }

  if (notifyMode === 'email' || notifyMode === 'both') {
    try {
      // @ts-ignore — JA-008 pending: email.ts does not exist yet
      const { notifyEmail } = await import('./notifications/email.js');
      await notifyEmail(agentResult.relevant, searchParams, summary);
      console.log('  📧 Email: sent');
    } catch (e) {
      console.log('  📧 Email: not available (JA-008 pending)');
      logError('email-notify', e as Error);
    }
  }

  if (notifyMode === 'none') {
    console.log('\n🔕 Notifications disabled (NOTIFY=none)');
  }

  // ── Step 8: markAsSeen and close ────────────────────────────────────────
  if (agentResult.relevant.length > 0) {
    markAsSeen(agentResult.relevant.map(j => j.id));
  }

  console.log('\n' + '─'.repeat(60));
  console.log('✅ Run complete\n');
}

main().catch(err => {
  logError('run-main', err as Error);
  console.error('\n💥 Fatal error in orchestrator:', (err as Error).message);
  process.exit(1);
});
