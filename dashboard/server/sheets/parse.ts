import type { Goal, Metric, Scope, Period } from '../types.js';

// Minimal CSV parser — handles quoted fields with embedded commas, escaped
// double-quotes ("" -> "), CRLF and LF line endings. Sufficient for a <100-row
// goals sheet. Not a full RFC 4180 implementation.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // swallow; handled on \n
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // trailing field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const METRICS: Metric[] = ['visits', 'pageViews', 'visitors'];
const SCOPES: Scope[] = ['web', 'app', 'all'];
const PERIODS: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function parseGoalsCsv(text: string): Goal[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idx = (name: string): number => header.indexOf(name);

  const col = {
    metric: idx('metric'),
    scope: idx('scope'),
    source: idx('source'),
    period: idx('period'),
    target: idx('target'),
    startDate: idx('start_date'),
    endDate: idx('end_date'),
    notes: idx('notes'),
  };

  const required = ['metric', 'scope', 'source', 'period', 'target', 'start_date', 'end_date'];
  for (const r of required) {
    if (idx(r) === -1) {
      throw new Error(
        `Goals sheet is missing required column: "${r}". ` +
          `Expected headers: ${required.join(', ')}, notes (optional).`,
      );
    }
  }

  const goals: Goal[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const metric = row[col.metric]?.trim() as Metric;
    const scope = row[col.scope]?.trim() as Scope;
    const period = row[col.period]?.trim() as Period;
    const source = (row[col.source]?.trim() ?? 'all') || 'all';
    const targetRaw = row[col.target]?.trim() ?? '';
    const startDate = row[col.startDate]?.trim() ?? '';
    const endDate = row[col.endDate]?.trim() ?? '';
    const notes = col.notes >= 0 ? row[col.notes]?.trim() : undefined;

    if (!METRICS.includes(metric)) {
      throw new Error(`Goals row ${r + 1}: invalid metric "${metric}"`);
    }
    if (!SCOPES.includes(scope)) {
      throw new Error(`Goals row ${r + 1}: invalid scope "${scope}"`);
    }
    if (!PERIODS.includes(period)) {
      throw new Error(`Goals row ${r + 1}: invalid period "${period}"`);
    }
    const target = Number(targetRaw.replace(/[,_\s]/g, ''));
    if (!Number.isFinite(target) || target < 0) {
      throw new Error(`Goals row ${r + 1}: invalid target "${targetRaw}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error(`Goals row ${r + 1}: invalid start_date "${startDate}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error(`Goals row ${r + 1}: invalid end_date "${endDate}"`);
    }

    goals.push({
      metric,
      scope,
      source,
      period,
      target,
      startDate,
      endDate,
      notes: notes || undefined,
    });
  }
  return goals;
}
