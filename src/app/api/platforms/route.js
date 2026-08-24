import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiUrl = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    return NextResponse.json({ detail: 'Missing API key' }, { status: 500 });
  }
  try {
    const res = await fetch(`${apiUrl}/api/platforms`, {
      headers: { 'x-api-key': apiKey.trim() },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ detail: 'Failed to fetch platforms' }, { status: 502 });
  }
}
