import { fetchRemotive } from './remotive.js';
import { SearchParams } from '../types.js';

const searchParams: SearchParams = { role: 'Senior Full-Stack Engineer', stack: ['React', 'Node.js'], remote: true };
const jobs = await fetchRemotive(searchParams);

console.log(`\n✅ Remotive: ${jobs.length} jobs found\n`);

jobs.slice(0, 3).forEach((job, i) => {
  console.log(`--- Job ${i + 1} ---`);
  console.log('title:', job.title);
  console.log('company:', job.company);
  console.log('location:', job.location);
  console.log('modality:', job.modality);
  console.log('salary:', job.salary);
  console.log('stack:', job.stack);
  console.log('description (preview):', job.description.slice(0, 100) + '...');
  console.log('url:', job.url);
  console.log('source:', job.source);
  console.log('publishedAt:', job.publishedAt);
});

const requiredFields = ['id','title','company','location','modality','salary','stack','description','url','source','publishedAt'] as const;
const firstJob = jobs[0];
const missingFields = requiredFields.filter(f => !(f in firstJob));
if (missingFields.length > 0) {
  console.error('❌ Missing fields in schema:', missingFields);
  process.exit(1);
} else {
  console.log('\n✅ Complete schema — all fields present');
}

const noHtml = jobs.every(j => !/<[^>]+>/.test(j.description));
console.log(noHtml ? '✅ No HTML tags in description' : '❌ description contains HTML');

const allRemote = jobs.every(j => j.modality === 'remote');
console.log(allRemote ? '✅ modality is always "remote"' : '❌ incorrect modality');

const noEmptySalary = jobs.every(j => j.salary !== '');
console.log(noEmptySalary ? '✅ salary is never an empty string' : '❌ salary has empty string');

console.log('\nDates (should be descending):');
console.log(jobs.map(j => j.publishedAt));
