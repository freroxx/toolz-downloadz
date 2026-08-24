import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBackend() {
  const apiUrl = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
  const apiKey = process.env.API_SECRET_KEY;
  return { apiUrl, apiKey };
}

function buildTargetUrl(base, params) {
  // params is URLSearchParams with url + optional flags
  const qs = params.toString();
  return `${base}/api/extract${qs ? `?${qs}` : ''}`;
}

async function proxyFetch(targetUrl, apiKey) {
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey.trim(),
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    // Pass through cache header if present
    const res = NextResponse.json(data);
    const cacheStatus = response.headers.get('x-cache') || data._cached ? 'HIT' : null;
    if (cacheStatus) res.headers.set('X-Cache', 'HIT');
    const reqId = response.headers.get('x-request-id');
    if (reqId) res.headers.set('X-Request-ID', reqId);
    return res;
  } else {
    const text = await response.text();
    console.error(`[Proxy Error] Upstream non-JSON (${response.status}):`, text.slice(0, 400));
    return NextResponse.json({ detail: 'Media extraction server returned invalid response.' }, { status: 502 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ detail: 'URL query parameter is missing (?url=...)' }, { status: 400 });
  }

  const { apiUrl, apiKey } = getBackend();
  if (!apiKey) {
    console.error('[Proxy Error] API_SECRET_KEY missing');
    return NextResponse.json({ detail: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  // Forward all supported query params to backend
  const forward = new URLSearchParams();
  forward.set('url', url);
  for (const k of ['format', 'audio_only', 'playlist', 'subtitles']) {
    const v = searchParams.get(k);
    if (v !== null) forward.set(k, v);
  }

  const targetUrl = buildTargetUrl(apiUrl, forward);

  try {
    return await proxyFetch(targetUrl, apiKey);
  } catch (error) {
    console.error('[Proxy Error] Fetch failed:', error);
    return NextResponse.json({ detail: 'Could not connect to extraction server.' }, { status: 502 });
  }
}

export async function POST(request) {
  const { apiUrl, apiKey } = getBackend();
  if (!apiKey) {
    console.error('[Proxy Error] API_SECRET_KEY missing');
    return NextResponse.json({ detail: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.url) {
    return NextResponse.json({ detail: 'Missing url in body' }, { status: 400 });
  }

  // For POST, we hit backend POST /api/extract
  const targetUrl = `${apiUrl}/api/extract`;
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) return NextResponse.json(data, { status: response.status });
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      console.error(`[Proxy POST Error] non-JSON (${response.status}):`, text.slice(0, 300));
      return NextResponse.json({ detail: 'Upstream returned invalid response' }, { status: 502 });
    }
  } catch (error) {
    console.error('[Proxy POST Error] Fetch failed:', error);
    return NextResponse.json({ detail: 'Could not connect to extraction server.' }, { status: 502 });
  }
}
