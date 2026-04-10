import type { DataResponse } from './types';

export async function getData(): Promise<DataResponse> {
  const res = await fetch('/api/data');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET /api/data ${res.status}: ${body}`);
  }
  return res.json();
}

export async function refresh(): Promise<DataResponse> {
  const res = await fetch('/api/refresh', { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`POST /api/refresh ${res.status}: ${body}`);
  }
  return res.json();
}
