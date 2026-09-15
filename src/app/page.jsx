'use client'

import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', style: 'bg-black text-white' },
  { id: 'instagram', name: 'Instagram', style: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white' },
]

const platformStyle = (p) =>
  PLATFORMS.find((x) => x.id === p)?.style ?? 'bg-primary text-primary-on'

const THEMES = ['auto', 'light', 'dark']

function applyTheme(t) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'auto' && mq.matches))
}

function ThemeToggle() {
  const [theme, setTheme] = useState('auto')

  useEffect(() => {
    const stored = localStorage.getItem('toolz-theme') || 'auto'
    setTheme(stored)
    applyTheme(stored)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const followOS = () => {
      if ((localStorage.getItem('toolz-theme') || 'auto') === 'auto') applyTheme('auto')
    }
    mq.addEventListener('change', followOS)
    return () => mq.removeEventListener('change', followOS)
  }, [])

  const cycle = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('toolz-theme', next)
    applyTheme(next)
  }

  return (
    <button onClick={cycle} title={`Theme: ${theme} (click to change)`} aria-label={`Theme: ${theme}`}
      className="w-10 h-10 grid place-items-center rounded-full bg-surface-container-highest border border-outline-variant/20 hover:bg-primary/10 transition">
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path d="M8 21h8m-4-4v4" />
        </svg>
      )}
    </button>
  )
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('best')
  const [audioOnly, setAudioOnly] = useState(false)
  const [ladderLoading, setLadderLoading] = useState(false)
  const [ladderError, setLadderError] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('url')
    if (q) setUrl(q)
  }, [])

  const friendlyError = (status, detail) => {
    if (status === 429) return 'Too many requests — wait a minute and try again.'
    if (status === 504) return 'Taking too long — the servers are busy. Try again.'
    if (status === 502) return 'The download servers are struggling. Try again in a bit.'
    return detail || `Request failed (${status})`
  }

  const fetchExtract = async (extra, timeoutMs = 28000) => {
    const params = new URLSearchParams({ url, ...(extra || {}) })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(`/api/extract?${params}`, { signal: ctrl.signal })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(friendlyError(res.status, json?.detail))
      return json
    } catch (err) {
      throw err.name === 'AbortError'
        ? new Error('Taking too long — the servers are busy. Try again.')
        : err
    } finally {
      clearTimeout(timer)
    }
  }

  const extract = async (e, mode) => {
    e?.preventDefault()
    const wantAudio = mode ?? audioOnly
    if (!url.trim() || status === 'loading') return
    setStatus('loading')
    setError('')
    setData(null)
    setLadderError('')
    try {
      window.history.replaceState(null, '', `?url=${encodeURIComponent(url)}`)
      const json = await fetchExtract(wantAudio ? { audio_only: 'true' } : {})
      setData(json)
      setSelected('best')
      setStatus('success')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStatus('error')
    }
  }

  const loadLadder = async () => {
    if (ladderLoading || !data || status === 'loading') return
    setLadderLoading(true)
    setLadderError('')
    try {
      const json = await fetchExtract({ ladder: 'true' }, 45000)
      setData(json)
      setSelected('best')
    } catch (err) {
      setLadderError(err.message || 'Full quality list unavailable.')
    } finally {
      setLadderLoading(false)
    }
  }

  const pickMode = (wantAudio) => {
    setAudioOnly(wantAudio)
    setSelected('best')
    if (url.trim() && status !== 'loading' && data) extract(null, wantAudio)
  }

  const fmtBytes = (n) =>
    !n ? '' : n >= 1 << 30 ? (n / (1 << 30)).toFixed(2) + ' GB'
      : n >= 1 << 20 ? (n / (1 << 20)).toFixed(1) + ' MB'
      : n >= 1 << 10 ? (n / (1 << 10)).toFixed(0) + ' KB'
      : n + ' B'

  const fmtDur = (s) =>
    !s ? null : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const fmtNum = (n) =>
    n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)

  const safeName = (s) =>
    s.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'media'

  // Explicit has_audio from the API wins; otherwise infer from codecs.
  // Unknown stays unknown — never rendered as a fact.
  const withSound = (f) =>
    f.has_audio === true || (f.has_audio == null && f.acodec && f.acodec !== 'none')

  // Short display names for observed codecs. Unmappable values are omitted,
  // never shown raw — a codec tag on screen means "observed in the file".
  const CODECS = {
    h264: 'H.264', avc1: 'H.264',
    h265: 'HEVC', hev1: 'HEVC', hevc: 'HEVC', bytevc1: 'HEVC',
    aac: 'AAC', mp4a: 'AAC', mp3: 'MP3', opus: 'Opus',
  }
  const codecName = (c) => {
    if (!c || c === 'none') return null
    return CODECS[String(c).toLowerCase().split('.')[0]] || null
  }

  // p-labels come from observed height only: "1080p" states lines in the file.
  const pLabel = (h) => (h ? `${h}p${h >= 720 ? ' HD' : ''}` : null)

  const options = () => {
    if (!data || data.blocked) return { best: null, withSound: [], videoOnly: [], audio: [] }
    const mk = (f, i, kind) => {
      const dims = f.width && f.height ? `${f.width}×${f.height}` : null
      const sub = [
        dims,
        f.filesize ? fmtBytes(f.filesize) : 'size unknown',
        codecName(f.vcodec),
        f.fps ? `${f.fps}fps` : null,
        f.ip_free ? 'works anywhere' : null,
      ].filter(Boolean).join(' · ')
      return {
        key: `${kind[0]}${i}`,
        fid: f.format_id,
        url: f.url,
        ext: f.ext || (kind === 'audio' ? 'mp3' : 'mp4'),
        label: kind === 'audio'
          ? (codecName(f.acodec) || 'Audio')
          : (pLabel(f.height) || (f.resolution && f.resolution !== 'unknown' ? f.resolution : (f.ext?.toUpperCase() || kind))),
        size: f.filesize ? fmtBytes(f.filesize) : 'size unknown',
        sub,
      }
    }
    const videos = data.formats?.video || []
    const withSoundRows = videos.filter(withSound).map((f, i) => mk(f, i, 'video'))
    const videoOnlyRows = videos.filter((f) => !withSound(f)).map((f, i) => mk(f, i, 'video'))
    const audioRows = (data.formats?.audio || []).map((f, i) => mk(f, i, 'audio'))
    const match = [...withSoundRows, ...videoOnlyRows, ...audioRows]
      .find((r) => r.url && r.url === data.download_url)
    return {
      // Best names what it actually is, so the default quality is never a mystery.
      best: data.download_url
        ? {
            key: 'best', fid: 'best', url: data.download_url,
            ext: data.ext || (audioOnly ? 'mp3' : 'mp4'),
            label: match?.label || (audioOnly ? 'Best audio' : 'Best (video + audio)'),
            size: match?.size || '',
            sub: match?.sub || '',
          }
        : null,
      withSound: withSoundRows,
      videoOnly: videoOnlyRows,
      audio: audioRows,
    }
  }

  const opts = options()
  // The video grid is skipped when Best already covers the only video row —
  // a second button for the same file is not a choice.
  const mainRows = opts.withSound.length > 1 ? opts.withSound : opts.videoOnly
  const mainTitle = opts.withSound.length > 1
    ? 'Video with sound'
    : (opts.withSound.length === 0 ? 'Video' : 'Video only (no sound)')
  const active = opts.best && selected === 'best'
    ? opts.best
    : [...opts.withSound, ...opts.videoOnly, ...opts.audio].find((f) => f.key === selected) ?? opts.best

  const downloadAs = (fid, ext) => {
    if (!data) return
    // API streams the media itself — its IP signed the CDN URL, so this works
    // for TikTok where a separate proxy would get 403.
    const p = new URLSearchParams({
      u: data.original_url || url,
      f: fid || 'best',
      n: `${safeName(data.title || 'media')}.${ext}`,
    })
    window.location.href = `/api/download?${p}`
  }

  const download = () => {
    if (!active || !data) return
    downloadAs(active.fid, active.ext)
  }

  const QualitySection = ({ title, rows }) => (
    rows.length > 0 && (
      <div className="px-4 pt-2 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">{title}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
          {rows.map((f) => (
            <button key={f.key} onClick={() => setSelected(f.key)}
              title={f.sub}
              className={`px-3 py-2.5 rounded-xl border-2 text-center transition ${
                selected === f.key
                  ? 'bg-primary text-primary-on border-primary shadow'
                  : 'bg-surface-bright border-outline-variant/15 hover:border-primary/40'
              }`}>
              <div className="font-black text-sm truncate">{f.label}</div>
              <div className="text-[9px] font-bold opacity-60 truncate">{f.sub}</div>
            </button>
          ))}
        </div>
      </div>
    )
  )

  const showLadderBtn = data?.platform === 'tiktok' && data?.ladder === 'fast' && !audioOnly && !data?.blocked

  return (
    <div className="min-h-screen bg-surface-dim text-surface-on selection:bg-primary/30 font-sans">
      {/* Top bar */}
      <nav className="fixed top-0 inset-x-0 z-50 px-5 py-3.5 flex justify-between items-center bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-on font-black shadow-md shadow-primary/20">TD</div>
          <span className="font-extrabold text-lg tracking-tight">Toolz Downloadz</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="https://github.com/freroxx/toolz-downloadz" target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-full bg-surface-container-highest text-sm font-bold border border-outline-variant/20 hover:bg-primary/10 transition">
            GitHub
          </a>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-4 max-w-2xl mx-auto flex flex-col items-center gap-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-primary leading-none">
            Downloadz
          </h1>
          <p className="text-surface-on-variant font-medium">Paste a link. Get the video. That's it.</p>
        </div>

        {/* Platforms */}
        <div className="flex gap-2 flex-wrap justify-center animate-[fadein_.5s_ease]">
          {PLATFORMS.map((p) => (
            <span key={p.id} className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow ${p.style}`}>
              {p.name}
            </span>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={extract} className="w-full relative animate-[fadein_.5s_ease]">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste TikTok / Instagram link…"
            inputMode="url"
            autoComplete="off"
            aria-label="TikTok or Instagram link"
            className="w-full pl-6 pr-32 py-5 rounded-full bg-surface-bright text-lg border-4 border-transparent focus:border-primary/25 outline-none placeholder:text-surface-on-variant/40 shadow-lg dark:shadow-black/40 transition-all"
          />
          <button
            disabled={status === 'loading'}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-7 py-3 rounded-full bg-primary text-primary-on font-black hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow"
          >
            {status === 'loading' ? '…' : 'Get'}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="flex gap-2 -mt-4" role="group" aria-label="Download type">
          {[{ v: false, label: 'Video' }, { v: true, label: 'MP3' }].map((m) => (
            <button key={m.label} onClick={() => pickMode(m.v)}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition ${
                audioOnly === m.v
                  ? 'bg-primary text-primary-on shadow'
                  : 'bg-surface-container-highest border border-outline-variant/20 hover:bg-primary/10'
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Result area */}
        <div className="w-full">
          {status === 'loading' && (
            <div key="l" className="w-full space-y-4 animate-[fadein_.3s_ease]">
              <div className="aspect-video rounded-[2rem] bg-surface-container-high animate-pulse" />
              <div className="h-10 w-3/4 rounded-2xl bg-surface-container-high animate-pulse" />
              <div className="h-6 w-1/2 rounded-2xl bg-surface-container-high animate-pulse" />
            </div>
          )}

          {status === 'error' && (
            <div key="e" className="w-full p-8 rounded-[2rem] bg-error-container text-error-onContainer text-center space-y-4 animate-[fadein_.3s_ease]">
              <div className="text-4xl">⚠</div>
              <h3 className="font-black text-xl">Couldn't extract that link</h3>
              <p className="text-sm opacity-80 break-words">{error}</p>
              <button onClick={() => setStatus('idle')} className="px-6 py-2.5 rounded-full bg-error text-error-on font-bold text-sm">Try again</button>
            </div>
          )}

          {status === 'success' && data && (
            <div key="s" className="w-full rounded-[2rem] overflow-hidden bg-surface-container border border-outline-variant/10 shadow-xl animate-[fadein_.35s_ease]">
              {/* Media head */}
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-1/2 aspect-video relative bg-surface-container-high">
                  {data.thumbnail ? (
                    <img src={data.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-5xl">🎬</div>
                  )}
                  <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow ${platformStyle(data.platform)}`}>
                    {data.platform}
                  </span>
                  {fmtDur(data.duration) && (
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-white text-xs font-black">
                      {fmtDur(data.duration)}
                    </span>
                  )}
                </div>
                <div className="sm:w-1/2 p-6 flex flex-col gap-3 justify-center bg-surface-container-high/40">
                  <h2 className="font-black text-lg leading-snug line-clamp-3">{data.title}</h2>
                  {data.uploader && <p className="text-primary font-bold text-sm">{data.uploader}</p>}
                  {!data.blocked && data.stats && (
                    <div className="flex gap-4 text-xs font-bold text-surface-on-variant/60 pt-1">
                      {data.stats.view_count != null && <span>👁 {fmtNum(data.stats.view_count)}</span>}
                      {data.stats.like_count != null && <span>♥ {fmtNum(data.stats.like_count)}</span>}
                      {data.stats.comment_count != null && <span>💬 {fmtNum(data.stats.comment_count)}</span>}
                    </div>
                  )}
                </div>
              </div>

              {data.blocked ? (
                <div className="p-6 m-4 rounded-2xl bg-tertiary-container text-tertiary-onContainer text-sm font-bold leading-relaxed">
                  ⚠ {data.blocked_message}
                </div>
              ) : (
                <>
                  {mainRows.length > 0 && (
                    <QualitySection title={mainTitle} rows={mainRows} />
                  )}
                  {opts.videoOnly.length > 0 && opts.withSound.length > 1 && (
                    <QualitySection title="Video only (no sound)" rows={opts.videoOnly} />
                  )}
                  {opts.audio.length > 0 && (
                    <div className="px-4 pt-2 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">Audio</p>
                      {opts.audio.map((f) => (
                        <button key={f.key} onClick={() => downloadAs(f.fid, f.ext)}
                          className="w-full px-4 py-3 rounded-xl bg-surface-bright border-2 border-outline-variant/15 hover:border-primary/40 transition flex justify-between items-center gap-2">
                          <span className="font-black text-sm truncate">{f.label}</span>
                          <span className="text-[10px] font-bold opacity-60 whitespace-nowrap">↓ {f.ext.toUpperCase()} · {f.size}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showLadderBtn && (
                    <div className="px-4 pt-3 text-center space-y-1">
                      <button onClick={loadLadder} disabled={ladderLoading}
                        className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-surface-bright border border-outline-variant/20 hover:bg-primary/10 disabled:opacity-50 transition">
                        {ladderLoading ? 'Loading qualities…' : 'More qualities'}
                      </button>
                      {ladderError && (
                        <p className="text-[10px] font-bold text-error">{ladderError}</p>
                      )}
                    </div>
                  )}
                  {data.ladder === 'full' && (
                    <p className="px-4 pt-3 text-center text-[10px] font-bold text-surface-on-variant/50">
                      H.264 plays everywhere · HEVC is smaller but older devices may not play it
                    </p>
                  )}
                  <div className="p-4">
                    <button onClick={download} disabled={!active}
                      className="w-full py-4 rounded-2xl bg-primary text-primary-on font-black text-lg shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all">
                      DOWNLOAD ↓ <span className="opacity-70 text-sm font-bold">{active?.ext.toUpperCase()}</span>
                    </button>
                    {active && (active.sub || active.size) && (
                      <p className="pt-2 text-center text-xs font-bold text-surface-on-variant/60">
                        {[active.label, active.sub || active.size].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="pb-10 text-center text-xs font-black tracking-[0.4em] uppercase text-surface-on-variant/25">
        TikTok and Instagram Downloader
      </footer>
    </div>
  )
}
