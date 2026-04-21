// test-agent.ts
// Runs in mock mode by default — no API tokens spent.
// To test with the real API: AGENT_MODE=real node test-agent.ts

process.env.AGENT_MODE ??= 'mock';

import { runJobAgent } from './agent.js';
import { rmSync }      from 'fs';
import { Job, SearchParams } from './types.js';

// Clear previous state
rmSync('data/jobs.json', { force: true });
rmSync('logs/agent.log',  { force: true });

const MOCK_JOBS: Job[] = [
  {
    id:          'https://remotive.com/job/1',
    url:         'https://remotive.com/job/1',
    title:       'Senior Full-Stack Engineer',
    company:     'Vercel',
    location:    'Remote',
    modality:    'remote',
    salary:      '$130,000 - $160,000',
    stack:       ['React', 'Node.js', 'TypeScript'],
    description: 'Building the future of web. React and Node.js required.',
    source:      'remotive',
    publishedAt: new Date().toISOString()
  },
  {
    id:          'https://remotive.com/job/2',
    url:         'https://remotive.com/job/2',
    title:       'Backend Engineer (Python)',
    company:     'Stripe',
    location:    'Remote',
    modality:    'remote',
    salary:      null,
    stack:       ['Python', 'Django', 'PostgreSQL'],
    description: 'Python backend only. No frontend work.',
    source:      'remotive',
    publishedAt: new Date().toISOString()
  },
  {
    id:          'https://remotive.com/job/3',
    url:         'https://remotive.com/job/3',
    title:       'Full-Stack Developer',
    company:     'Linear',
    location:    'Remote',
    modality:    'remote',
    salary:      '$90,000 - $110,000',
    stack:       ['React', 'Ruby on Rails'],
    description: 'React frontend, Rails backend.',
    source:      'remotive',
    publishedAt: new Date().toISOString()
  }
];

const searchParams: SearchParams = {
  role:      'Senior Full-Stack Engineer',
  stack:     ['React', 'Node.js'],
  remote:    true,
  minSalary: 100000
};

const result = await runJobAgent(MOCK_JOBS, searchParams);

console.log('\n─────────────────────────────────');
console.log(`📊 SUMMARY  [mode: ${process.env.AGENT_MODE}]`);
console.log('─────────────────────────────────');
console.log(`✅ Relevant:   ${result.relevant.length}`);
result.relevant.forEach(j => console.log(`   • ${j.title} — ${j.company}`));
console.log(`🟡 Borderline: ${result.borderline.length}`);
result.borderline.forEach(j => console.log(`   • ${j.title} — ${j.company}`));
console.log(`⬜ Ignored:    ${result.ignored.length}`);
console.log(`🔢 Evaluated:  ${result.totalEvaluated} / ${MOCK_JOBS.length}`);
console.log('─────────────────────────────────');

// ── Validations ────────────────────────────────────────────────────────────
const errors: string[] = [];

if (result.totalEvaluated !== MOCK_JOBS.length)
  errors.push(`totalEvaluated=${result.totalEvaluated}, expected ${MOCK_JOBS.length}`);

if (result.relevant.length + result.borderline.length + result.ignored.length !== MOCK_JOBS.length)
  errors.push('Classification counts do not add up');

// In mock mode, Job 1 (React+Node.js) should be relevant; Job 2 (Python) should be ignored
if (process.env.AGENT_MODE === 'mock') {
  const job1 = result.relevant.find(j => j.id === 'https://remotive.com/job/1');
  const job2 = result.ignored.find(j =>  j.id === 'https://remotive.com/job/2');
  if (!job1) errors.push('Job 1 (React+Node.js) should be relevant in mock mode');
  if (!job2) errors.push('Job 2 (Python only) should be ignored in mock mode');
}

if (errors.length > 0) {
  errors.forEach(e => console.log(`\n❌ ${e}`));
  process.exit(1);
} else {
  console.log('\n✅ All validations passed');
}
