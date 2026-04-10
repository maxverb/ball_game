import type { PianoRequest } from './types.js';

const BASE_METRICS = ['m_visits', 'm_page_views', 'm_unique_visitors'];

export interface QueryArgs {
  siteId: number;
  start: string;
  end: string;
}

/** Overall daily totals — one row per date. */
export function buildOverallDailyQuery(args: QueryArgs): PianoRequest {
  return {
    spaces: [{ s: [args.siteId] }],
    columns: ['d_date', ...BASE_METRICS],
    period: { p1: [{ type: 'D', start: args.start, end: args.end }] },
    sort: ['d_date'],
    'max-results': 10000,
    'page-num': 1,
    evo: false,
  };
}

/** Split by device type so we can map into scope web/app. */
export function buildByDeviceQuery(args: QueryArgs): PianoRequest {
  return {
    spaces: [{ s: [args.siteId] }],
    columns: ['d_date', 'd_device_type', ...BASE_METRICS],
    period: { p1: [{ type: 'D', start: args.start, end: args.end }] },
    sort: ['d_date'],
    'max-results': 10000,
    'page-num': 1,
    evo: false,
  };
}

/** Split by source (top sources including Google Discover). */
export function buildBySourceQuery(args: QueryArgs): PianoRequest {
  return {
    spaces: [{ s: [args.siteId] }],
    columns: ['d_date', 'd_src_source', ...BASE_METRICS],
    period: { p1: [{ type: 'D', start: args.start, end: args.end }] },
    sort: ['d_date'],
    'max-results': 10000,
    'page-num': 1,
    evo: false,
  };
}
