import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { logError } from './logger.js';
import { Job }        from '../agents/job-search/types.js';
import { SaveResult } from '../types.js';

const DATA_DIR  = 'data';
const JOBS_FILE = 'data/jobs.json';

export function loadJobs(): Job[] {
  try {
    const raw = readFileSync(JOBS_FILE, 'utf-8');
    return JSON.parse(raw) as Job[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    logError('storage', e as Error);
    return [];
  }
}

export function saveJobs(newJobs: Job[]): SaveResult {
  const existing = loadJobs();
  const seenUrls = new Set(existing.map(j => j.id));

  let duplicates = 0;
  const toAdd: Job[] = [];

  for (const job of newJobs) {
    if (seenUrls.has(job.id)) {
      duplicates++;
    } else {
      toAdd.push({ ...job, savedAt: new Date().toISOString(), seen: false });
      seenUrls.add(job.id);
    }
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(JOBS_FILE, JSON.stringify([...existing, ...toAdd], null, 2));

  return { added: toAdd.length, duplicates };
}

export function getNewJobs(): Job[] {
  return loadJobs().filter(j => j.seen === false);
}

export function markAsSeen(ids: string[]): { updated: number } {
  const jobs = loadJobs();
  const idSet = new Set(ids);
  let updated = 0;

  for (const job of jobs) {
    if (idSet.has(job.id)) {
      job.seen = true;
      updated++;
    }
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));

  return { updated };
}
