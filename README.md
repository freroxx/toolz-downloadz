<div align="center">
  <img src="https://i.ibb.co/jvt7B2Cy/toolz-glass-icon-dark-bg.png" width="80" alt="Toolz Logo" />
  <h1>Toolz Downloadz</h1>
  <p><strong>The sleek, multi-platform media downloader frontend — TikTok · Instagram · YouTube</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
  [![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge&logo=gnu&logoColor=white)](LICENSE)

  <p>
    <a href="https://discord.gg/aAswRUerwh">💬 Discord</a> &nbsp;·&nbsp;
    <a href="https://github.com/freroxx/toolz">📱 Main App</a> &nbsp;·&nbsp;
    <a href="https://github.com/freroxx/toolz-downloadz-api">⚙️ API Backend</a> &nbsp;·&nbsp;
    <a href="CONTRIBUTING.md">🤝 Contributing</a>
  </p>
</div>

---

## ✨ What is Toolz Downloadz?

**Toolz Downloadz** is the web frontend for downloading media from TikTok, Instagram, and YouTube. Built with Next.js and styled with a Material 3-inspired design system, it connects to the [toolz-downloadz-api](https://github.com/freroxx/toolz-downloadz-api) backend to deliver clean, watermark-free downloads in seconds.

Just paste a URL. Pick a quality. Download.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔗 **Universal URL Input** | Paste any TikTok, Instagram, or YouTube link |
| 🎬 **Quality Picker** | Choose 720p, 1080p, 4K, or Audio-Only |
| 🖼️ **Gallery Support** | Multi-image TikTok posts download as a zip |
| 🚫 **No Watermarks** | Architecture-aware download pipeline strips platform branding |
| 📱 **Mobile-Responsive** | Material 3-inspired UI that looks great on any screen |

---

## 🛠️ Setup & Development

### Prerequisites

- Node.js 20+
- A running [toolz-downloadz-api](https://github.com/freroxx/toolz-downloadz-api) instance

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_API_URL=https://your-api-instance.vercel.app
API_SECRET_KEY=your-secret-key
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build && npm start
```

---

## ☁️ Deploy to Vercel

The easiest way to deploy is with the [Vercel Platform](https://vercel.com/new):

1. Push this repo to GitHub
2. Import into Vercel
3. Set your environment variables in the Vercel dashboard
4. Deploy 🎉

---

## 🔗 Companion Repos

This frontend is part of the **Toolz** suite:

| Repo | Role |
|---|---|
| [toolz-downloadz-api](https://github.com/freroxx/toolz-downloadz-api) | REST API backend powering downloads |
| [toolz](https://github.com/freroxx/toolz) | Main Toolz suite app |

---

## ⚖️ Legal & Copyright Notice

1. **Personal Archival Only**: Toolz Downloadz is provided solely for personal, non-commercial archiving of media that users own or have explicit legal rights to download under applicable fair use or private copying exceptions.
2. **No DRM Circumvention**: This application does not defeat, bypass, or decrypt digital rights management (DRM) or access-restricted content.
3. **No Content Hosting**: Toolz Downloadz does not host, index, or distribute copyright-protected video, audio, or image files. All extraction is performed via transient, stream-through pipelines.
4. **Trademarks**: TikTok, ByteDance, Instagram, Meta, YouTube, and Google are trademarks of their respective owners. Toolz is an independent open-source project and is not affiliated with, sponsored by, or endorsed by any of these entities.

---

## 📄 License & Community

Distributed under the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE) for details.

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Accessibility Statement](ACCESSIBILITY.md)

---

<div align="center">
  <img src="https://i.ibb.co/jvt7B2Cy/toolz-glass-icon-dark-bg.png" width="48" alt="Toolz Logo" /><br/>
  <sub>Part of the <a href="https://github.com/freroxx/toolz"><strong>Toolz Suite</strong></a> · Built with ❤️ by <a href="https://github.com/freroxx">freroxx</a></sub>
</div>
