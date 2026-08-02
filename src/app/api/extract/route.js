import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ detail: 'URL query parameter is missing' }, { status: 400 });
  }

  // Ensure we use the correct backend URL and clean any trailing slashes
  const apiUrl = (process.env.API_URL || 'https://toolz-downloadz-api.vercel.app').replace(/\/$/, '');
  const apiKey = process.env.API_SECRET_KEY;

  if (!apiKey) {
    console.error('[Proxy Error] API_SECRET_KEY is not defined in environment variables.');
    return NextResponse.json({ detail: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  try {
    const targetUrl = `${apiUrl}/api/extract?url=${encodeURIComponent(url)}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey.trim(),
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      console.error(`[Proxy Error] Upstream returned non-JSON (${response.status}):`, text.slice(0, 200));
      return NextResponse.json({ detail: 'Media extraction server returned an invalid response format.' }, { status: 502 });
    }
  } catch (error) {
    console.error('[Proxy Error] Fetch failed:', error);
    return NextResponse.json({ detail: 'Could not connect to the extraction server. Please try again.' }, { status: 502 });
  }
}
