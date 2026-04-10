import type { Cache, DailyRow, Scope } from './types.js';
import { loadConfig, type Config } from './config.js';
import { readCache, writeCache } from './cache.js';
import { pianoQuery } from './piano/client.js';
import {
  buildOverallDailyQuery,
  buildByDeviceQuery,
  buildBySourceQuery,
} from './piano/queries.js';
import type { PianoRowRaw } from './piano/types.js';
import { fetchGoals } from './sheets/client.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function startOfYearIsoDate(): string {
  const year = new Date().getUTCFullYear();
  return `${year}-01-01`;
}

function toNumber(val: string | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function toScope(deviceType: string | number | null | undefined): Scope {
  if (deviceType == null) return 'all';
  const s = String(deviceType).toLowerCase();
  if (/(mobile app|native app|app|application)/.test(s)) return 'app';
  if (/(desktop|tablet|mobile|smartphone|web|browser)/.test(s)) return 'web';
  return 'web';
}

function rowToDaily(
  r: PianoRowRaw,
  scope: Scope,
  source: string,
): DailyRow | null {
  const date = r['d_date'];
  if (date == null) return null;
  return {
    date: String(date),
    scope,
    source,
    visits: toNumber(r['m_visits']),
    pageViews: toNumber(r['m_page_views']),
    visitors: toNumber(r['m_unique_visitors']),
  };
}

function dedupeRows(rows: DailyRow[]): DailyRow[] {
  // Later entries win. Key on (date, scope, source).
  const map = new Map<string, DailyRow>();
  for (const r of rows) {
    map.set(`${r.date}|${r.scope}|${r.source}`, r);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.scope !== b.scope) return a.scope < b.scope ? -1 : 1;
    return a.source < b.source ? -1 : a.source > b.source ? 1 : 0;
  });
}

export interface FetchOptions {
  since?: string;
  until?: string;
}

/**
 * Run one full fetch cycle: Piano overall + by-device + by-source in parallel,
 * plus the Google Sheet, merge with existing cache, and write atomically.
 */
export async function runFetch(
  config: Config,
  opts: FetchOptions = {},
): Promise<Cache> {
  const startedAt = Date.now();

  const start = opts.since ?? startOfYearIsoDate();
  const end = opts.until ?? yesterdayIsoDate();
  const siteId = Number(config.pianoSiteId);
  if (!Number.isFinite(siteId)) {
    throw new Error(`PIANO_SITE_ID must be a number, got "${config.pianoSiteId}"`);
  }

  const existing = await readCache();
  const fetchErrors: string[] = [];

  // Kick off the three Piano queries in parallel.
  const [overallRaw, byDeviceRaw, bySourceRaw] = await Promise.all([
    pianoQuery(config, buildOverallDailyQuery({ siteId, start, end })),
    pianoQuery(config, buildByDeviceQuery({ siteId, start, end })),
    pianoQuery(config, buildBySourceQuery({ siteId, start, end })),
  ]);

  const newRows: DailyRow[] = [];

  for (const r of overallRaw) {
    const row = rowToDaily(r, 'all', 'all');
    if (row) newRows.push(row);
  }

  for (const r of byDeviceRaw) {
    const scope = toScope(r['d_device_type']);
    const row = rowToDaily(r, scope, 'all');
    if (row) newRows.push(row);
  }

  for (const r of bySourceRaw) {
    const srcRaw = r['d_src_source'];
    const source = srcRaw == null || String(srcRaw).trim() === '' ? 'unknown' : String(srcRaw);
    const row = rowToDaily(r, 'all', source);
    if (row) newRows.push(row);
  }

  // Merge with existing cache: old rows first, new rows win on conflict.
  const mergedDaily = dedupeRows([...(existing?.daily ?? []), ...newRows]);

  // Goals are always refetched in full (sheet is tiny).
  let goals = existing?.goals ?? [];
  try {
    goals = await fetchGoals(config.googleSheetCsvUrl);
  } catch (err) {
    fetchErrors.push(
      `Google Sheets fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const cache: Cache = {
    generatedAt: new Date().toISOString(),
    siteId: config.pianoSiteId,
    period: { start, end },
    daily: mergedDaily,
    goals,
    meta: {
      googleDiscoverSourceKey: config.googleDiscoverSourceKey,
      lastFetchDurationMs: Date.now() - startedAt,
      fetchErrors,
    },
  };

  await writeCache(cache);
  return cache;
}

// CLI entry: `tsx server/fetch.ts --once` (or --since=YYYY-MM-DD)
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const opts: FetchOptions = {};
  for (const arg of args) {
    if (arg.startsWith('--since=')) opts.since = arg.slice('--since='.length);
    if (arg.startsWith('--until=')) opts.until = arg.slice('--until='.length);
  }
  const config = loadConfig();
  const cache = await runFetch(config, opts);
  const latest = cache.daily.length > 0 ? cache.daily[cache.daily.length - 1]!.date : 'none';
  console.log(
    `Fetched ${cache.daily.length} daily rows, ${cache.goals.length} goals. ` +
      `Period: ${cache.period.start} -> ${cache.period.end}. Latest row: ${latest}. ` +
      `Duration: ${cache.meta.lastFetchDurationMs}ms. Errors: ${cache.meta.fetchErrors.length}`,
  );
  if (cache.meta.fetchErrors.length > 0) {
    for (const e of cache.meta.fetchErrors) console.error(`  - ${e}`);
    process.exit(2);
  }
}

// Invoke main only when called directly (not when imported by server/index.ts).
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('server/fetch.ts') ||
  process.argv[1]?.endsWith('server/fetch.js');
if (isMain) {
  main().catch((err) => {
    console.error('Fetch failed:', err);
    process.exit(1);
  });
}

// Keep the reference so esbuild/ts don't strip it.
export { todayIsoDate };
