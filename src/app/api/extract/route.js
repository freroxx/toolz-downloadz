import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const API_URL = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
const API_KEY = process.env.API_SECRET_KEY || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const audioOnly = searchParams.get('audio_only');

  if (!url) {
    return NextResponse.json({ detail: 'Missing ?url=' }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ detail: 'Server misconfigured: API_SECRET_KEY missing' }, { status: 500 });
  }

  const params = new URLSearchParams({ url });
  if (audioOnly) params.set('audio_only', 'true');

  try {
    const res = await fetch(`${API_URL}/api/extract?${params}`, {
      headers: { 'x-api-key': API_KEY.trim() },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!data) {
      return NextResponse.json({ detail: `API returned invalid response (${res.status})` }, { status: 502 });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('[extract proxy]', e);
    return NextResponse.json({ detail: 'Could not reach the extraction API. Is it deployed?' }, { status: 502 });
  }
}
