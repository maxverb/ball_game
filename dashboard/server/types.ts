// Shared types used by both the Express server and the React frontend.
// The frontend re-exports these via src/types.ts so there is one source of truth.

export type Metric = 'visits' | 'pageViews' | 'visitors';
export type Scope = 'web' | 'app' | 'all';
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DailyRow {
  date: string; // YYYY-MM-DD
  scope: Scope;
  source: string; // 'all' | 'google_discover' | 'google_organic' | ...
  visits: number;
  pageViews: number;
  visitors: number;
}

export interface Goal {
  metric: Metric;
  scope: Scope;
  source: string; // 'all' or a specific source key
  period: Period;
  target: number;
  startDate: string; // inclusive YYYY-MM-DD
  endDate: string; // inclusive YYYY-MM-DD
  notes?: string;
}

export interface CacheMeta {
  googleDiscoverSourceKey: string;
  lastFetchDurationMs: number;
  fetchErrors: string[];
}

export interface Cache {
  generatedAt: string; // ISO timestamp
  siteId: string;
  period: { start: string; end: string }; // YYYY-MM-DD inclusive, covers YTD
  daily: DailyRow[];
  goals: Goal[];
  meta: CacheMeta;
}

export interface DataResponse {
  cache: Cache;
  stale: boolean;
}
