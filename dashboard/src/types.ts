// Re-export server types so the frontend has a single source of truth.
export type {
  Metric,
  Scope,
  Period,
  DailyRow,
  Goal,
  CacheMeta,
  Cache,
  DataResponse,
} from '../server/types';
