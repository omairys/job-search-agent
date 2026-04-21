import axios                      from 'axios';
import { logError, logAgentTool } from '../tools/logger.js';
import { Job, SearchParams } from '../agents/job-search/types.js';
import { NotifySummary }    from '../types.js';

export async function notifyDiscord(jobs: Job[], searchParams: SearchParams, summary: NotifySummary): Promise<void> {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    logError('discord', new Error('DISCORD_WEBHOOK_URL not defined'));
    return;
  }

  let embed;

  if (jobs.length === 0) {
    embed = {
      title: '😴 No relevant jobs today',
      description: `No jobs found for **${searchParams.role}** above the minimum score of ${searchParams.minScore}/10.`,
      color: 0x95a5a6,
      footer: { text: `Evaluated: ${summary.totalEvaluated} | Ignored: ${summary.ignored}` },
      timestamp: new Date().toISOString()
    };
  } else {
    embed = {
      title: `🔍 ${summary.relevant} new job(s) for: ${searchParams.role}`,
      color: summary.relevant > 0 ? 0x5865f2 : 0x95a5a6,
      fields: jobs.map(j => ({
        name:   `${j.title} — ${j.company}`,
        value:  `📍 ${j.location} | 🏷️ ${j.source} | ⭐ Score: ${j.score}/10\n🔗 [View job](${j.url})`,
        inline: false
      })),
      footer: {
        text: `Evaluated: ${summary.totalEvaluated} | Borderline: ${summary.borderline} | Ignored: ${summary.ignored}`
      },
      timestamp: new Date().toISOString()
    };
  }

  const payload = {
    username:   'Job Search Agent',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/4616/4616734.png',
    embeds: [embed]
  };

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, payload);
    logAgentTool('notifyDiscord', { jobs: jobs.length, role: searchParams.role }, { embedsSent: 1 });
  } catch (error) {
    logError('discord', error as Error);
  }
}
