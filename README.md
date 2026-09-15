# toolz-downloadz

Paste a TikTok or Instagram link, get the video. Next.js frontend for [toolz-downloadz-api](https://github.com/freroxx/toolz-downloadz-api).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffreroxx%2Ftoolz-downloadz&env=API_URL,API_SECRET_KEY)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

Deploy the API first, then point this app at it.

## How it works

The browser only talks to Next.js `/api/*` routes, which inject the API key server-side:

- `GET /api/extract?url=…&audio_only=…` proxies to the API and returns the JSON as-is.
- `GET /api/download?u=…&f=best&n=…` 307-redirects to the API's downloader (the API must stream the bytes itself: TikTok signs media URLs to the extracting server's IP).

The UI shows thumbnail, title, uploader, stats, and a quality picker grouped into video with sound / video only / audio. Rows state observed specs (`1080p HD`, dimensions, size, codec); `~`-prefixed labels are approximate and unknown sizes render as "size unknown". The video grid collapses when Best already covers the only video row, and the download button names the default quality. TikTok results list the full ladder up front (540p / 720p H.264 / 720p HEVC / 1080p). A Video/MP3 toggle switches between video and audio extraction, and a nav button cycles the theme (auto follows the OS, saved in localStorage). Shared links (`/?url=<link>`) pre-fill the input.

## Deploy

Import in Vercel (Framework Preset: Next.js), set these vars, deploy:

| Variable | Required | Example |
|---|---|---|
| `API_URL` | yes | `https://<your-api>.vercel.app` (no trailing slash) |
| `API_SECRET_KEY` | yes | Same value as the API's `API_SECRET_KEY`. Never use a `NEXT_PUBLIC_` prefix. |

## Local dev

```bash
npm install
cp .env.example .env   # set API_URL + API_SECRET_KEY
npm run dev            # http://localhost:3000
```

`npm run build`, `npm start`, `npm run lint`. Point `API_URL` at the deployed API or a local one (`http://localhost:8000`).

## Project structure

```
src/app/page.jsx              # the UI: input, result card, quality picker, download
src/app/layout.jsx            # fonts, metadata
src/app/globals.css           # Tailwind + Material 3 tokens (light/dark)
src/app/api/extract/route.js  # proxy to API /api/extract
src/app/api/download/route.js # 307 redirect to API /api/download
```

Branding lives in `page.jsx` and `layout.jsx`; theme tokens in `globals.css` + `tailwind.config.js`.

Manual smoke test: TikTok URL downloads mp4; MP3 mode downloads audio; Instagram reel works (needs `INSTAGRAM_COOKIES` on the API); YouTube/Vimeo shows the unsupported-URL error; API down shows the unreachable-API error.

Contributions: fork, branch, PR with screenshots for UI changes. Keep dependencies to Next + React + Tailwind; no secrets in client components.

Legal: only download content you own or have the right to save. Not affiliated with TikTok, Meta, or Vercel.

License: [GPL-3.0](LICENSE).
