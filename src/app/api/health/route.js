import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const apiUrl = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
  try {
    const res = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ status: 'offline', error: String(e) }, { status: 502 });
  }
}
