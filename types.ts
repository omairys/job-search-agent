export type Modality       = 'remote' | 'hybrid' | 'onsite';
export type JobSource      = 'remotive' | 'greenhouse' | 'linkedin' | 'manual';
export type Classification = 'relevant' | 'borderline' | 'ignore';

export interface Job {
  id:          string;
  title:       string;
  company:     string;
  location:    string;
  modality:    Modality;
  salary:      string | null;
  stack:       string[];
  description: string;
  url:         string;
  source:      JobSource;
  publishedAt: string;
  // fields added by storage:
  savedAt?:    string;
  seen?:       boolean;
  // field added by the agent:
  score?:      number;
}

export interface SearchParams {
  role:       string;
  location?:  string;
  minScore?:  number;
  limit?:     number;
  stack?:     string[];
  remote?:    boolean;
  minSalary?: number;
}

export interface AgentResult {
  relevant:       Job[];
  borderline:     Job[];
  ignored:        Job[];
  totalEvaluated: number;
}

export interface NotifySummary {
  totalEvaluated: number;
  relevant:       number;
  borderline:     number;
  ignored:        number;
}

export interface SaveResult {
  added:      number;
  duplicates: number;
}
