import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_HOST_RE = /^https?:\/\//i;
const SAFE_NAME_RE = /[^\p{L}\p{N} ._\-\u2013\u2014]/gu;

// Media CDNs we are allowed to proxy. Keeps the route from being an open proxy.
const ALLOWED_MEDIA_HOSTS = [
  'googlevideo.com',
  'youtube.com',
  'youtu.be',
  'ytimg.com',
  'tiktokcdn.com',
  'tiktok.com',
  'cdninstagram.com',
  'instagram.com',
  'fbcdn.net',
  'fbsbx.com',
  'twimg.com',
  'twitter.com',
  'x.com',
  'redd.it',
  'reddit.com',
  'redditmedia.com',
  'amazonaws.com',
  'cloudfront.net',
  'akamaized.net',
];

function hostAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    return ALLOWED_MEDIA_HOSTS.some((s) => host === s || host.endsWith('.' + s));
  } catch {
    return false;
  }
}

function safeFilename(name) {
  const cleaned = String(name || 'media')
    .replace(SAFE_NAME_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || 'media';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const name = safeFilename(searchParams.get('name'));
  const headersB64 = searchParams.get('headers');

  if (!target || !ALLOWED_HOST_RE.test(target) || !hostAllowed(target)) {
    return NextResponse.json({ detail: 'Invalid download URL' }, { status: 400 });
  }

  const upstreamHeaders = new Headers();
  upstreamHeaders.set('Accept', '*/*');
  upstreamHeaders.set('Connection', 'keep-alive');

  // Echo exact request headers from the extractor (required by CDN signatures).
  if (headersB64) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(headersB64))));
      if (decoded && typeof decoded === 'object') {
        for (const [k, v] of Object.entries(decoded)) {
          if (k && v != null) upstreamHeaders.set(k, String(v));
        }
      }
    } catch {
      // fall back to the defaults below if provided headers fail to parse
    }
  }
  if (!upstreamHeaders.has('User-Agent')) {
    upstreamHeaders.set('User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  }

  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('Range', range);

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: upstreamHeaders,
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach the media source.' }, { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `The media source rejected the request (${upstream.status}).` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');

  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (contentRange) headers.set('Content-Range', contentRange);
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, {
    status: upstream.status === 206 ? 206 : 200,
    headers,
  });
}