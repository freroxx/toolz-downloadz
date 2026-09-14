import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TikTok/Instagram sign media URLs to the extracting server's IP, so we can't
// fetch them from this separate function. Instead we 307-redirect to the API's
// own /api/download which resolves (cache-first) and streams from the SAME
// instance that extracted — keeping the signature valid.
const API_URL = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
const API_KEY = process.env.API_SECRET_KEY || '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get('u');   // original page URL
  const f = searchParams.get('f') || 'best';
  const n = searchParams.get('n') || 'media';

  if (!u) return NextResponse.json({ detail: 'Missing ?u=' }, { status: 400 });
  if (!API_KEY) return NextResponse.json({ detail: 'Server misconfigured: API_SECRET_KEY missing' }, { status: 500 });

  const target = `${API_URL}/api/download?${new URLSearchParams({ u, f, n, key: API_KEY.trim() })}`;
  return NextResponse.redirect(target, 307);
}
