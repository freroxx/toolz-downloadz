import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
const SESSION_COOKIE = 'toolz_downloadz_session';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const extractionId = searchParams.get('e');
  const assetId = searchParams.get('a');
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!extractionId || !assetId) return NextResponse.json({ detail: 'Missing download asset.' }, { status: 400 });
  if (!token) return NextResponse.json({ detail: 'Your download session expired. Extract the link again.' }, { status: 401 });

  try {
    const upstream = await fetch(
      `${API_URL}/api/v1/extractions/${encodeURIComponent(extractionId)}/assets/${encodeURIComponent(assetId)}/download`,
      { headers: { authorization: `Bearer ${token}`, range: request.headers.get('range') || '' }, cache: 'no-store' },
    );
    if (!upstream.ok && upstream.status !== 206) {
      const body = await upstream.json().catch(() => null);
      return NextResponse.json({ detail: body?.detail || 'The download could not be prepared.' }, { status: upstream.status });
    }
    const headers = new Headers();
    for (const name of ['content-disposition', 'content-length', 'content-range', 'content-type', 'accept-ranges', 'cache-control']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error('[download proxy]', error);
    return NextResponse.json({ detail: 'Could not start the download. Please retry.' }, { status: 502 });
  }
}
