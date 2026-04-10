import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Cache } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// data/cache.json lives at dashboard/data/cache.json regardless of whether we're
// running from source (tsx) or compiled (dist-server/). Resolve upward until we
// find a `dashboard` folder or give up at three levels.
function resolveDataDir(): string {
  const candidates = [
    path.resolve(__dirname, '..', 'data'), // tsx: server/cache.ts -> ../data
    path.resolve(__dirname, '..', '..', 'data'), // dist-server/server/cache.js -> ../../data
    path.resolve(process.cwd(), 'data'),
  ];
  return candidates[0]!;
}

const DATA_DIR = resolveDataDir();
const CACHE_PATH = path.join(DATA_DIR, 'cache.json');
const TMP_PATH = path.join(DATA_DIR, 'cache.json.tmp');

export async function readCache(): Promise<Cache | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    return JSON.parse(raw) as Cache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeCache(cache: Cache): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TMP_PATH, JSON.stringify(cache, null, 2), 'utf8');
  await fs.rename(TMP_PATH, CACHE_PATH);
}

export function getCachePath(): string {
  return CACHE_PATH;
}
