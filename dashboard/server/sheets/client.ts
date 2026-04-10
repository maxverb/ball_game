import type { Goal } from '../types.js';
import { parseGoalsCsv } from './parse.js';

/**
 * Fetch the published-to-web Google Sheet CSV URL and parse it into goals.
 * The URL should look like:
 *   https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=YYY&single=true&output=csv
 */
export async function fetchGoals(csvUrl: string): Promise<Goal[]> {
  const res = await fetch(csvUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Google Sheet CSV: ${res.status} ${res.statusText}`,
    );
  }
  const text = await res.text();
  return parseGoalsCsv(text);
}
