import type { Config } from '../config.js';
import type { PianoRequest, PianoResponse, PianoRowRaw } from './types.js';

const RETRY_DELAYS_MS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST a Data Query request to Piano. Retries on 5xx/network errors with
 * exponential backoff. Does NOT retry on 4xx (auth / malformed request).
 */
export async function pianoQuery(
  config: Config,
  body: PianoRequest,
): Promise<PianoRowRaw[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(config.pianoBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Piano Analytics documented header format: "<access_key>_<secret_key>"
          'x-api-key': `${config.pianoAccessKey}_${config.pianoSecretKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status >= 500) {
        throw new Error(`Piano API ${res.status}: ${await res.text()}`);
      }
      if (!res.ok) {
        // 4xx: don't retry
        throw new Error(
          `Piano API ${res.status} ${res.statusText}: ${await res.text()}`,
        );
      }

      const json = (await res.json()) as PianoResponse;
      return extractRows(json);
    } catch (err) {
      lastError = err;
      const isRetryable =
        err instanceof TypeError || // network error in fetch
        (err instanceof Error && /Piano API 5\d\d/.test(err.message));
      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]!);
    }
  }
  throw lastError;
}

function extractRows(response: PianoResponse): PianoRowRaw[] {
  const feeds = response.DataFeed ?? [];
  const out: PianoRowRaw[] = [];
  for (const feed of feeds) {
    if (feed && Array.isArray(feed.Rows)) out.push(...feed.Rows);
  }
  return out;
}
