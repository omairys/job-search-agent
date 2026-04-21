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
