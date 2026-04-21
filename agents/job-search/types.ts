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
  savedAt?:    string;
  seen?:       boolean;
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
