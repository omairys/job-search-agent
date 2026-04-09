import axios from 'axios';
import { logError } from '../tools/logger.js';
import { Job, SearchParams } from '../types.js';

const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';

interface RemotiveJob {
  url:                          string;
  title:                        string;
  company_name:                 string;
  candidate_required_location:  string;
  salary:                       string;
  tags:                         string[];
  description:                  string;
  publication_date:             string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeJob(job: RemotiveJob): Job {
  return {
    id:          job.url,
    title:       job.title,
    company:     job.company_name,
    location:    job.candidate_required_location,
    modality:    'remote',
    salary:      job.salary || null,
    stack:       job.tags,
    description: stripHtml(job.description).slice(0, 800),
    url:         job.url,
    source:      'remotive',
    publishedAt: new Date(job.publication_date).toISOString(),
  };
}

function matchesRole(title: string, role: string): boolean {
  const words = role.split(/\s+/).filter(w => w.length > 3);
  const titleLower = title.toLowerCase();
  return words.some(w => titleLower.includes(w.toLowerCase()));
}

function extractSearchKeyword(role: string): string {
  const words = role.split(/\s+/).filter(w => w.length > 3);
  // Use the last significant word (e.g. "Engineer" from "Senior Full-Stack Engineer")
  return words[words.length - 1] || role;
}

export async function fetchRemotive(searchParams: SearchParams): Promise<Job[]> {
  try {
    const keyword = extractSearchKeyword(searchParams.role);
    const { data } = await axios.get<{ jobs: RemotiveJob[] }>(REMOTIVE_API, {
      params: { search: keyword, limit: 50 },
    });

    const jobs = data.jobs
      .filter(job => matchesRole(job.title, searchParams.role))
      .map(normalizeJob)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20);

    return jobs;
  } catch (error) {
    logError('remotive', error as Error);
    return [];
  }
}
