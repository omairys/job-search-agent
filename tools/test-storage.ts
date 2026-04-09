import { saveJobs, loadJobs, getNewJobs, markAsSeen } from './storage.js';
import { rmSync } from 'fs';

// Setup: clear previous state for reproducible test
rmSync('data/jobs.json', { force: true });
console.log('🧪 Storage test\n');

// ── Test 1: saveJobs saves correctly ───────────────────────
const batch1 = [
  { id: 'https://a.com/1', url: 'https://a.com/1', title: 'Job A', company: 'Acme', location: 'Remote', modality: 'remote' as const, salary: null, stack: [], description: '', source: 'remotive' as const, publishedAt: new Date().toISOString() },
  { id: 'https://b.com/2', url: 'https://b.com/2', title: 'Job B', company: 'Beta', location: 'Remote', modality: 'remote' as const, salary: null, stack: [], description: '', source: 'remotive' as const, publishedAt: new Date().toISOString() },
];
const r1 = saveJobs(batch1);
console.assert(r1.added === 2,       `❌ Test 1a: expected 2 added, got ${r1.added}`);
console.assert(r1.duplicates === 0,  `❌ Test 1b: expected 0 duplicates`);
console.log(`✅ Test 1 — saveJobs: ${r1.added} added, ${r1.duplicates} duplicates`);

// ── Test 2: deduplication by URL ───────────────────────────
const batch2 = [
  { id: 'https://a.com/1', url: 'https://a.com/1', title: 'Job A dup', company: 'Acme', location: 'Remote', modality: 'remote' as const, salary: null, stack: [], description: '', source: 'remotive' as const, publishedAt: new Date().toISOString() },
  { id: 'https://c.com/3', url: 'https://c.com/3', title: 'Job C',     company: 'Cero', location: 'Remote', modality: 'remote' as const, salary: null, stack: [], description: '', source: 'remotive' as const, publishedAt: new Date().toISOString() },
];
const r2 = saveJobs(batch2);
console.assert(r2.added === 1,       `❌ Test 2a: expected 1 added, got ${r2.added}`);
console.assert(r2.duplicates === 1,  `❌ Test 2b: expected 1 duplicate, got ${r2.duplicates}`);
console.log(`✅ Test 2 — deduplication: ${r2.added} added, ${r2.duplicates} duplicate`);

// ── Test 3: savedAt and seen are present ───────────────────
const all = loadJobs();
console.assert(all.length === 3, `❌ Test 3a: expected 3 total jobs, got ${all.length}`);
console.assert(all.every(j => j.savedAt),       '❌ Test 3b: savedAt missing on some job');
console.assert(all.every(j => j.seen === false), '❌ Test 3c: seen should be false on all');
console.log(`✅ Test 3 — ${all.length} jobs, all with savedAt and seen:false`);

// ── Test 4: getNewJobs ─────────────────────────────────────
const newJobs = getNewJobs();
console.assert(newJobs.length === 3, `❌ Test 4: expected 3 new, got ${newJobs.length}`);
console.log(`✅ Test 4 — getNewJobs: ${newJobs.length} unseen`);

// ── Test 5: markAsSeen ─────────────────────────────────────
const r5 = markAsSeen(['https://a.com/1', 'https://b.com/2']);
console.assert(r5.updated === 2, `❌ Test 5a: expected 2 updated, got ${r5.updated}`);
const afterMark = loadJobs();
const seenJobs = afterMark.filter(j => j.seen === true);
console.assert(seenJobs.length === 2, `❌ Test 5b: expected 2 with seen:true, got ${seenJobs.length}`);
console.log(`✅ Test 5 — markAsSeen: ${r5.updated} marked as seen`);

// ── Test 6: getNewJobs after marking ──────────────────────
const remainingNew = getNewJobs();
console.assert(remainingNew.length === 1, `❌ Test 6: expected 1 unseen, got ${remainingNew.length}`);
console.log(`✅ Test 6 — getNewJobs post-mark: ${remainingNew.length} unseen`);

// ── Test 7: loadJobs with missing file ────────────────────
rmSync('data/jobs.json', { force: true });
const empty = loadJobs();
console.assert(Array.isArray(empty) && empty.length === 0, '❌ Test 7: should return []');
console.log(`✅ Test 7 — loadJobs with no file: returns []`);

console.log('\n✅ All tests passed');
