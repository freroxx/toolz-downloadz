import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const API_URL = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
const SESSION_COOKIE = 'toolz_downloadz_session';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const audioOnly = searchParams.get('audio_only') === 'true';
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!url) return NextResponse.json({ detail: 'Missing ?url=' }, { status: 400 });
  if (!token) return NextResponse.json({ detail: 'Your download session expired. Please try again.' }, { status: 401 });

  try {
    const res = await fetch(`${API_URL}/api/v1/extractions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url, audio_only: audioOnly }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!data) return NextResponse.json({ detail: `API returned invalid response (${res.status})` }, { status: 502 });
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[extract proxy]', error);
    return NextResponse.json({ detail: 'Could not reach the extraction API. Please retry.' }, { status: 502 });
  }
}
