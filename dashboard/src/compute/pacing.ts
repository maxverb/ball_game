import type { Cache, DailyRow, Goal, Metric, Period, Scope } from '../types';

export type PeriodKey = 'today' | 'week' | 'month' | 'ytd';

export interface PeriodRange {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  label: string;
}

export interface PacingResult {
  actual: number;
  target: number | null;
  pctOfGoal: number | null; // null if no goal
  daysElapsed: number;
  daysTotal: number;
  expectedByNow: number | null;
  onPace: 'good' | 'warn' | 'bad' | 'none';
  projectedEnd: number | null;
}

// Convert ISO YYYY-MM-DD to a Date at UTC midnight (timezone-safe for math).
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = isoToDate(start).getTime();
  const b = isoToDate(end).getTime();
  return Math.round((b - a) / (24 * 3600 * 1000)) + 1;
}

/**
 * Compute period start/end. `referenceDate` is typically the latest day in the
 * cache (so "today" really means "the most recent data we have"). This keeps
 * the dashboard honest when Piano is T-1.
 */
export function getPeriodRange(
  key: PeriodKey,
  referenceIso: string,
): PeriodRange {
  const ref = isoToDate(referenceIso);
  const y = ref.getUTCFullYear();

  switch (key) {
    case 'today':
      return { start: referenceIso, end: referenceIso, label: 'Today' };
    case 'week': {
      // ISO week: Monday -> Sunday. Find Monday of ref's week.
      const day = ref.getUTCDay(); // 0=Sun..6=Sat
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(ref);
      monday.setUTCDate(monday.getUTCDate() + diffToMon);
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      return { start: dateToIso(monday), end: dateToIso(sunday), label: 'Week' };
    }
    case 'month': {
      const first = new Date(Date.UTC(y, ref.getUTCMonth(), 1));
      const last = new Date(Date.UTC(y, ref.getUTCMonth() + 1, 0));
      return { start: dateToIso(first), end: dateToIso(last), label: 'Month' };
    }
    case 'ytd': {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`,
        label: 'YTD',
      };
    }
  }
}

/**
 * Filter daily rows to a (metric, scope, source, period) slice and sum.
 * `source === 'all'` matches rows where the source is 'all' (overall bucket).
 * `scope === 'all'` matches rows with scope 'all' specifically.
 */
export function sumMetric(
  rows: DailyRow[],
  metric: Metric,
  scope: Scope,
  source: string,
  start: string,
  end: string,
): number {
  let total = 0;
  for (const r of rows) {
    if (r.date < start || r.date > end) continue;
    if (r.scope !== scope) continue;
    if (r.source !== source) continue;
    total += r[metric];
  }
  return total;
}

export function findGoal(
  goals: Goal[],
  metric: Metric,
  scope: Scope,
  source: string,
  period: Period,
  referenceIso: string,
): Goal | null {
  // Match the goal whose [startDate, endDate] covers referenceIso.
  for (const g of goals) {
    if (g.metric !== metric) continue;
    if (g.scope !== scope) continue;
    if (g.source !== source) continue;
    if (g.period !== period) continue;
    if (referenceIso < g.startDate || referenceIso > g.endDate) continue;
    return g;
  }
  return null;
}

const PERIOD_TO_KIND: Record<PeriodKey, Period> = {
  today: 'daily',
  week: 'weekly',
  month: 'monthly',
  ytd: 'yearly',
};

export function computePacing(
  cache: Cache,
  metric: Metric,
  scope: Scope,
  source: string,
  periodKey: PeriodKey,
): PacingResult {
  const referenceIso = latestDate(cache) ?? cache.period.end;
  const range = getPeriodRange(periodKey, referenceIso);

  const actual = sumMetric(
    cache.daily,
    metric,
    scope,
    source,
    range.start,
    range.end,
  );

  const goal = findGoal(
    cache.goals,
    metric,
    scope,
    source,
    PERIOD_TO_KIND[periodKey],
    referenceIso,
  );

  const daysTotal = daysBetweenInclusive(range.start, range.end);
  const daysElapsedRaw = daysBetweenInclusive(range.start, referenceIso);
  const daysElapsed = Math.min(Math.max(daysElapsedRaw, 0), daysTotal);

  if (!goal || goal.target <= 0) {
    return {
      actual,
      target: null,
      pctOfGoal: null,
      daysElapsed,
      daysTotal,
      expectedByNow: null,
      onPace: 'none',
      projectedEnd: null,
    };
  }

  const target = goal.target;
  const pctOfGoal = (actual / target) * 100;
  const expectedByNow = (target * daysElapsed) / daysTotal;
  const projectedEnd = daysElapsed > 0 ? (actual / daysElapsed) * daysTotal : 0;
  const onPaceRatio = expectedByNow > 0 ? actual / expectedByNow : 1;
  const onPace: PacingResult['onPace'] =
    onPaceRatio >= 1 ? 'good' : onPaceRatio >= 0.85 ? 'warn' : 'bad';

  return {
    actual,
    target,
    pctOfGoal,
    daysElapsed,
    daysTotal,
    expectedByNow,
    onPace,
    projectedEnd,
  };
}

export function latestDate(cache: Cache): string | null {
  let latest: string | null = null;
  for (const r of cache.daily) {
    if (latest === null || r.date > latest) latest = r.date;
  }
  return latest;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return Math.round(n).toString();
}
