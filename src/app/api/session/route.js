import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
const SESSION_COOKIE = 'toolz_downloadz_session';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const installationId = String(body?.installation_id || '');
  if (installationId.length < 16 || installationId.length > 128) {
    return NextResponse.json({ detail: 'Invalid browser installation.' }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${API_URL}/api/v1/client-sessions`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ installation_id: installationId }), cache: 'no-store',
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data?.access_token) {
      return NextResponse.json({ detail: data?.detail || 'Could not create a download session.' }, { status: upstream.status || 502 });
    }
    const response = NextResponse.json({ expires_in: data.expires_in });
    response.cookies.set(SESSION_COOKIE, data.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
      maxAge: Number(data.expires_in) || 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('[session proxy]', error);
    return NextResponse.json({ detail: 'Could not reach the download service.' }, { status: 502 });
  }
}
