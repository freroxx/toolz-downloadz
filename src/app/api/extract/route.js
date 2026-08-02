import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ detail: 'URL is required' }, { status: 400 });
  }

  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_SECRET_KEY;

  if (!apiUrl || !apiKey) {
    console.error('Missing environment variables: API_URL or API_SECRET_KEY');
    return NextResponse.json({ detail: 'Server configuration error' }, { status: 500 });
  }

  try {
    const response = await fetch(`${apiUrl}/api/extract?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
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
      console.error('Unexpected response from API:', text);
      return NextResponse.json({ detail: 'Upstream API error' }, { status: 502 });
    }
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return NextResponse.json({ detail: 'Failed to connect to extraction server' }, { status: 502 });
  }
}
