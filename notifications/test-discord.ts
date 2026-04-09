import 'dotenv/config';
import { notifyDiscord } from './discord.js';
import { Job, SearchParams, NotifySummary } from '../types.js';

const mockJobs: Partial<Job>[] = [
  {
    title:    'Senior Frontend Engineer',
    company:  'Linear',
    location: 'Remote',
    source:   'remotive',
    score:    9,
    url:      'https://linear.app/jobs/frontend'
  },
  {
    title:    'Staff Engineer',
    company:  'Vercel',
    location: 'Remote — LATAM',
    source:   'greenhouse',
    score:    8,
    url:      'https://vercel.com/careers/staff-engineer'
  }
];

const mockSearchParams: SearchParams = { role: 'Frontend Engineer', location: 'Remote', minScore: 7 };
const mockSummary: NotifySummary     = { totalEvaluated: 12, relevant: 2, borderline: 3, ignored: 7 };

console.log('📤 Sending embed with 2 relevant jobs...');
await notifyDiscord(mockJobs as Job[], mockSearchParams, mockSummary);

console.log('📤 Sending zero-results embed...');
await notifyDiscord([], mockSearchParams, { ...mockSummary, relevant: 0 });

console.log('✅ Discord test complete');
