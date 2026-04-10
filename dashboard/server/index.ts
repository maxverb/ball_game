import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import express, { type Request, type Response, type NextFunction } from 'express';
import { loadConfig, type Config } from './config.js';
import { readCache } from './cache.js';
import { runFetch } from './fetch.js';
import type { Cache, DataResponse } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDistDir(): string {
  // When running from source via tsx, __dirname = dashboard/server
  // When running compiled, __dirname = dashboard/dist-server/server
  const candidates = [
    path.resolve(__dirname, '..', 'dist'), // tsx
    path.resolve(__dirname, '..', '..', 'dist'), // compiled
  ];
  return candidates[0]!;
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isCacheStale(cache: Cache, maxAgeHours: number): boolean {
  const ageMs = Date.now() - new Date(cache.generatedAt).getTime();
  if (ageMs > maxAgeHours * 60 * 60 * 1000) return true;
  // Also stale if the cache doesn't yet cover yesterday.
  if (cache.daily.length === 0) return true;
  const latestDate = cache.daily
    .map((r) => r.date)
    .sort()
    .pop()!;
  return latestDate < yesterdayIsoDate();
}

/**
 * Dedupes concurrent fetches: if a fetch is already in flight, subsequent
 * callers await the same promise.
 */
class FetchLock {
  private inFlight: Promise<Cache> | null = null;

  run(fn: () => Promise<Cache>): Promise<Cache> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = fn().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }
}

export function createApp(config: Config): express.Express {
  const app = express();
  const lock = new FetchLock();

  app.use(express.json());

  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const cache = await readCache();
      res.json({
        generatedAt: cache?.generatedAt ?? null,
        siteId: config.pianoSiteId,
        fetchErrors: cache?.meta.fetchErrors ?? [],
        hasCache: cache !== null,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/data', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      let cache = await readCache();
      let stale = false;
      if (cache === null || isCacheStale(cache, config.maxCacheAgeHours)) {
        stale = true;
        cache = await lock.run(() => runFetch(config));
      }
      const body: DataResponse = { cache: cache!, stale };
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/refresh', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cache = await lock.run(() => runFetch(config));
      const body: DataResponse = { cache, stale: true };
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  // Serve the built React app in production-like mode, if dist/ exists.
  const distDir = resolveDistDir();
  fs.stat(distDir)
    .then(() => {
      app.use(express.static(distDir));
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(distDir, 'index.html'));
      });
    })
    .catch(() => {
      // dist/ doesn't exist (dev mode with Vite on :5173). That's fine.
    });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api] error:', err);
    res.status(503).json({ error: err.message ?? String(err) });
  });

  return app;
}

function main(): void {
  const config = loadConfig();
  const app = createApp(config);
  app.listen(config.serverPort, () => {
    console.log(
      `Dashboard server listening on http://localhost:${config.serverPort}`,
    );
    console.log(`  - GET  /api/status`);
    console.log(`  - GET  /api/data    (auto-fetches if cache is stale)`);
    console.log(`  - POST /api/refresh (force fetch)`);
  });
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('server/index.ts') ||
  process.argv[1]?.endsWith('server/index.js');
if (isMain) main();
