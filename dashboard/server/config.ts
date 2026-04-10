import 'dotenv/config';

export interface Config {
  pianoAccessKey: string;
  pianoSecretKey: string;
  pianoSiteId: string;
  pianoBaseUrl: string;
  googleSheetCsvUrl: string;
  googleDiscoverSourceKey: string;
  maxCacheAgeHours: number;
  serverPort: number;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in the value.`,
    );
  }
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

export function loadConfig(): Config {
  return {
    pianoAccessKey: required('PIANO_ACCESS_KEY'),
    pianoSecretKey: required('PIANO_SECRET_KEY'),
    pianoSiteId: required('PIANO_SITE_ID'),
    pianoBaseUrl: optional(
      'PIANO_BASE_URL',
      'https://api.atinternet.io/v3/data/getData',
    ),
    googleSheetCsvUrl: required('GOOGLE_SHEET_CSV_URL'),
    googleDiscoverSourceKey: optional(
      'GOOGLE_DISCOVER_SOURCE_KEY',
      'google_discover',
    ),
    maxCacheAgeHours: Number(optional('MAX_CACHE_AGE_HOURS', '6')),
    serverPort: Number(optional('SERVER_PORT', '3001')),
  };
}
