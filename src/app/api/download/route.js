import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SAFE_NAME = /[^\p{L}\p{N} ._\-\u2013\u2014]/gu;

// Only media CDNs of the 3 supported platforms
const ALLOWED_HOSTS = [
  'googlevideo.com', 'youtube.com', 'youtu.be', 'ytimg.com',
  'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktok.com', 'akamaized.net', 'byteoversea.com',
  'cdninstagram.com', 'instagram.com', 'fbcdn.net',
];

function hostOk(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((s) => h === s || h.endsWith('.' + s));
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const name = (searchParams.get('name') || 'media').replace(SAFE_NAME, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'media';

  if (!target || !hostOk(target)) {
    return NextResponse.json({ detail: 'Invalid download URL' }, { status: 400 });
  }

  const upstreamHeaders = { Accept: '*/*' };
  if (searchParams.get('headers')) {
    try {
      Object.assign(upstreamHeaders, JSON.parse(decodeURIComponent(escape(atob(searchParams.get('headers'))))));
    } catch {}
  }
  if (!upstreamHeaders['User-Agent']) {
    upstreamHeaders['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
  }
  const range = request.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  let upstream;
  try {
    upstream = await fetch(target, { headers: upstreamHeaders, cache: 'no-store', redirect: 'follow' });
  } catch {
    return NextResponse.json({ detail: 'Could not reach media source' }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ detail: `Media source rejected request (${upstream.status})` }, { status: 502 });
  }

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
  });
  for (const k of ['content-length', 'content-range']) {
    const v = upstream.headers.get(k);
    if (v) headers.set(k.replace(/(^|-)(\w)/g, (m) => m.toUpperCase()), v);
  }

  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
}
