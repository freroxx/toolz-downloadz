# toolz-downloadz

Paste a **TikTok** or **Instagram** link. Get the video. That's it. ⚡

Modern, mobile-first web UI for the [`toolz-downloadz-api`](https://github.com/freroxx/toolz-downloadz-api) extraction engine — Next.js 15 + Tailwind + Material-3 expressive styling.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffreroxx%2Ftoolz-downloadz&env=API_URL,API_SECRET_KEY)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

> **Backend repo:** [`freroxx/toolz-downloadz-api`](https://github.com/freroxx/toolz-downloadz-api) — deploy that first, then point this app at it.

---

## ✨ Features

- 🎵 **TikTok** + 📸 **Instagram** (Reels & posts) — the only two supported platforms, by design
- 🔍 Paste-a-link extraction with thumbnail, title, uploader, views/likes/comments, duration
- 🎚️ Quality picker (Best + per-format video/audio list with sizes)
- ⬇️ One-tap download via the API's same-instance streamer (no CDN 403s)
- 🔗 Shareable URLs — `/?url=<link>` auto-fills the input
- 📱 Mobile-first, dark-mode-aware (Material 3 tokens), skeleton loaders, clean error cards
- 🔒 Secrets stay server-side — the browser only ever talks to Next.js `/api/*` proxies

## 🚫 Non-goals

- No YouTube support (removed in v4 — keeps the app fast, reliable, and easy to host)
- No login/accounts, no history, no playlists — one link at a time

---

## 🏗️ How it works

```
Browser ──▶ Next.js /api/extract?url=… ──▶ toolz-downloadz-api /api/extract
   │                  (injects X-API-KEY server-side)         │
   │◀────────────── JSON (title, formats[], download_url) ◀──┘
   │
   └──▶ click DOWNLOAD ──▶ Next.js /api/download?u=…&f=… ──▶ 307 ──▶ API /api/download
                                                              (same lambda re-resolves + streams bytes)
```

Why the hop? TikTok/Instagram sign media URLs to the extracting server's IP — the **API must stream the bytes itself**. The Next.js layer just 307-redirects so keys never leak to the client.

---

## 🚀 Deploy

You need **two** Vercel projects: the API first, then this web app.

### 1. Deploy the API

Follow [`toolz-downloadz-api` README](https://github.com/freroxx/toolz-downloadz-api#readme) → you'll get:

```
https://<your-api>.vercel.app
```

### 2. Deploy this frontend

**Option A — Vercel button (fastest):**

1. Click **Deploy with Vercel** above.
2. Set env vars (table below) → Deploy.

**Option B — manual:**

1. Push/fork this repo to GitHub.
2. **Vercel → Add New Project → Import** → Framework Preset: **Next.js**.
3. Add env vars → Deploy. No custom build settings needed.

### Environment variables

Set in **Vercel Dashboard → Settings → Environment Variables** (this project):

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `API_URL` | ✅ | `https://<your-api>.vercel.app` | Base URL of your deployed API (no trailing slash). |
| `API_SECRET_KEY` | ✅ | `openssl rand -hex 32` | **Must exactly match** the API's `API_SECRET_KEY`. Never expose with `NEXT_PUBLIC_` — route handlers inject it server-side. |

`.env.example` documents the same list.

---

## 💻 Local development

```bash
npm install
cp .env.example .env   # set API_URL + API_SECRET_KEY
npm run dev            # http://localhost:3000
```

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | Next.js lint |

Point `API_URL` at your deployed API — or at a local API (`http://localhost:8000`) while developing both.

---

## 🔌 Frontend routes

| Route | Description |
|---|---|
| `GET /` | The app. Accepts `?url=<link>` to pre-fill. |
| `GET /api/extract?url=…&audio_only=…` | Server proxy → `{API_URL}/api/extract` (injects `X-API-KEY`, returns JSON as-is). |
| `GET /api/download?u=…&f=best&n=name.mp4` | Server 307-redirect → `{API_URL}/api/download?…&key=…` (so browser navigation downloads with auth). |

Full extraction/download API docs live in the [backend README](https://github.com/freroxx/toolz-downloadz-api#api-reference).

---

## 📁 Project structure

```
toolz-downloadz/
├── src/app/
│   ├── page.jsx              # entire UI (input, result card, quality picker, download)
│   ├── layout.jsx            # fonts, metadata, M3 theme shell
│   ├── globals.css           # Tailwind + Material-3 design tokens (light/dark)
│   └── api/
│       ├── extract/route.js  # proxy → API /api/extract (key injected server-side)
│       └── download/route.js # 307 redirect → API /api/download
├── public/                   # static assets
├── .env.example              # API_URL + API_SECRET_KEY template
├── tailwind.config.js        # M3 color system wiring
├── next.config.mjs
├── vercel.json
└── LICENSE                   # GPL-3.0
```

---

## 🎨 Customization

- **Branding:** `src/app/page.jsx` (logo `TD`, hero, footer `Toolz Downloadz Engine v4`) + `src/app/layout.jsx` (metadata/OpenGraph).
- **Platform badges:** `PLATFORMS` array in `page.jsx` — TikTok (black) + Instagram (gradient).
- **Theme:** M3 CSS variables in `globals.css` + `tailwind.config.js` (`primary`, `surface`, … respond to `prefers-color-scheme` automatically).

---

## 🧪 Testing checklist (manual, 2 min)

- [ ] Paste TikTok URL → thumbnail + title + quality list → **DOWNLOAD** saves `.mp4`
- [ ] Paste Instagram Reel URL (with `INSTAGRAM_COOKIES` set on the API) → downloads
- [ ] Paste YouTube/Vimeo URL → clean error card (`Only TikTok and Instagram are supported`)
- [ ] Open `/?url=<tiktok-link>` → input pre-fills and is shareable
- [ ] API down → friendly `Could not reach the extraction API` error (no stack trace)

---

## 🤝 Contributing

1. Fork → branch (`feat/…` / `fix/…`).
2. `npm install && npm run dev` — keep it dependency-light (Next + React + Tailwind only).
3. Don't leak secrets: no `NEXT_PUBLIC_*` keys, no hardcoded API URLs in components (use `process.env` in route handlers).
4. Update `.env.example` + this README if you add env vars or routes.
5. Open a PR with screenshots/GIF for UI changes.

---

## ⚖️ Legal & fair use

- Only download content **you own or have the right to save** (your own posts, Creative Commons, explicit permission).
- Respect TikTok's and Instagram's **Terms of Service** and creators' rights — this tool is for personal archiving/fair-use workflows, not for re-uploading others' work.
- Not affiliated with TikTok, Instagram/Meta, or Vercel.

---

## 🙏 Acknowledgements

- Backend: [`freroxx/toolz-downloadz-api`](https://github.com/freroxx/toolz-downloadz-api) (FastAPI + yt-dlp + tikwm)
- [Next.js](https://nextjs.org/) · [React](https://react.dev/) · [Tailwind CSS](https://tailwindcss.com/)

---

## 📄 License

[GNU General Public License v3.0](LICENSE) — free to use, modify, and share under the same terms.
