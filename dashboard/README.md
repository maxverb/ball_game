# Piano Analytics Dashboard

A fully local web dashboard that pulls daily Piano Analytics data and compares it
against goals defined in a Google Sheet. Shows pacing across four horizons —
**daily, weekly, monthly, year-to-date** — for visits, pageviews, and visitors,
broken down by web/app and by traffic source including **Google Discover**.

Everything runs on your machine. Your Piano API key never leaves the box.

This package is **unrelated** to the ball game under `../web/`. Zero shared code,
zero shared dependencies.

## Architecture

- **Express API server** (`server/`) on `localhost:3001` — owns the Piano fetcher,
  the Google Sheets fetcher, and the on-disk cache at `data/cache.json`.
- **React + Vite frontend** (`src/`) — single-page dashboard that reads from
  `/api/data`. In dev, Vite runs on `:5173` and proxies `/api/*` to the Express
  server. In production mode (`npm run dashboard`), the Express server serves the
  built `dist/` assets itself, so everything runs on a single port.
- **Auto-fetch on open**: hitting `/api/data` triggers a refetch if the cache is
  older than `MAX_CACHE_AGE_HOURS` (default 6) or missing yesterday's data.

## Setup

1. Install deps:
   ```bash
   cd dashboard
   npm install
   ```

2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
   You need a **Piano Analytics access key + secret key** (ask your Piano admin,
   or generate one in Piano > Administration > API Keys) and your **site ID**.

3. Set up the goals Google Sheet (see schema below), then **File -> Share ->
   Publish to web -> select the `goals` tab -> CSV** and paste the URL into
   `GOOGLE_SHEET_CSV_URL` in `.env`.

4. Run a one-off fetch to populate the cache:
   ```bash
   npm run fetch:once
   ```
   Then open `data/cache.json` and look at the `daily[]` rows to find the exact
   source string Piano uses for Google Discover traffic. Update
   `GOOGLE_DISCOVER_SOURCE_KEY` in `.env` to match (often `google_discover` or
   `Google Discover` depending on your Piano config).

5. Daily use:
   ```bash
   npm run dashboard
   ```
   Then open <http://localhost:3001>. First load may take a few seconds while the
   cache refreshes; subsequent loads are instant.

6. Dev loop with hot reload:
   ```bash
   npm run dev
   ```
   Then open <http://localhost:5173>.

## Google Sheet `goals` schema

Create a tab named `goals` with this exact header row:

| metric | scope | source | period | target | start_date | end_date | notes |
|---|---|---|---|---|---|---|---|
| visits | all | all | monthly | 300000 | 2026-04-01 | 2026-04-30 | |
| pageViews | all | all | yearly | 12000000 | 2026-01-01 | 2026-12-31 | YTD goal |
| visitors | web | google_discover | monthly | 50000 | 2026-04-01 | 2026-04-30 | Discover push |
| visits | app | all | daily | 8000 | 2026-01-01 | 2026-12-31 | rolling |

**Rules:**
- `metric` ∈ `visits`, `pageViews`, `visitors`
- `scope` ∈ `web`, `app`, `all`
- `source` is `all` or a specific source key matching what Piano returns
  (e.g. `google_discover`, `google_organic`, `direct`)
- `period` ∈ `daily`, `weekly`, `monthly`, `yearly`
- `start_date` and `end_date` are inclusive, format `YYYY-MM-DD`
- For rolling daily goals, set a wide date range (e.g. full year)

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev mode: Vite (:5173) + Express (:3001) with hot reload |
| `npm run dashboard` | Build frontend + start Express on :3001 serving everything |
| `npm run fetch:once` | One-off Piano + Sheets fetch, writes `data/cache.json` |
| `npm run typecheck` | Type-check both frontend and server |
| `npm run build` | Build frontend (`dist/`) and server (`dist-server/`) |

## Data flow

```
.env ───┐
        ▼
  server/config.ts ──► server/fetch.ts ──► Piano Analytics API (3 queries)
                            │                 Google Sheets CSV
                            ▼
                    data/cache.json
                            ▲
                            │
  GET /api/data  (stale?  refetch, then return)
        ▲
        │
  React frontend (src/App.tsx) --fetch--> /api/data
```

## Files you'll never commit

- `.env` — Piano keys
- `data/` — cached Piano responses
- `node_modules/`, `dist/`, `dist-server/`
