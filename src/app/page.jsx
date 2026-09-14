'use client'

import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', style: 'bg-black text-white' },
  { id: 'instagram', name: 'Instagram', style: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white' },
]

const platformStyle = (p) =>
  PLATFORMS.find((x) => x.id === p)?.style ?? 'bg-primary text-primary-on'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('best')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('url')
    if (q) setUrl(q)
  }, [])

  const extract = async (e) => {
    e?.preventDefault()
    if (!url.trim()) return
    setStatus('loading')
    setError('')
    setData(null)
    try {
      window.history.replaceState(null, '', `?url=${encodeURIComponent(url)}`)
      const res = await fetch(`/api/extract?url=${encodeURIComponent(url)}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.detail || `Request failed (${res.status})`)
      setData(json)
      setSelected('best')
      setStatus('success')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStatus('error')
    }
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

  const options = () => {
    if (!data || data.blocked) return { best: null, video: [], audio: [] }
    const mk = (f, i, kind) => ({
      key: `${kind[0]}${i}`,
      fid: f.format_id,
      ext: f.ext || (kind === 'audio' ? 'mp3' : 'mp4'),
      label: f.resolution !== 'unknown' ? f.resolution : f.ext?.toUpperCase() || kind,
      detail:
        (kind === 'video' && f.acodec && f.acodec !== 'none' ? '' : kind === 'video' ? 'no audio · ' : '') +
        (f.filesize ? fmtBytes(f.filesize) : ''),
    })
    return {
      best: data.download_url
        ? { key: 'best', fid: 'best', ext: data.ext || 'mp4', label: 'Best quality', detail: 'recommended' }
        : null,
      video: (data.formats?.video || []).map((f, i) => mk(f, i, 'video')),
      audio: (data.formats?.audio || []).map((f, i) => mk(f, i, 'audio')),
    }
  }

  const opts = options()
  const all = [...(opts.best ? [opts.best] : []), ...opts.video, ...opts.audio]
  const active = all.find((f) => f.key === selected) ?? opts.best

  const download = () => {
    if (!active || !data) return
    // API streams the media itself — its IP signed the CDN URL, so this works
    // for TikTok where a separate proxy would get 403.
    const p = new URLSearchParams({
      u: data.original_url || url,
      f: active.fid || 'best',
      n: `${safeName(data.title || 'media')}.${active.ext}`,
    })
    window.location.href = `/api/download?${p}`
  }

  return (
    <div className="min-h-screen bg-surface-dim text-surface-on selection:bg-primary/30 font-sans">
      {/* Top bar */}
      <nav className="fixed top-0 inset-x-0 z-50 px-5 py-3.5 flex justify-between items-center bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-on font-black shadow-md shadow-primary/20">TD</div>
          <span className="font-extrabold text-lg tracking-tight">Toolz Downloadz</span>
        </div>
        <a href="https://github.com/freroxx/toolz-downloadz" target="_blank" rel="noopener noreferrer"
          className="px-5 py-2 rounded-full bg-surface-container-highest text-sm font-bold border border-outline-variant/20 hover:bg-primary/10 transition">
          GitHub
        </a>
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
            className="w-full pl-6 pr-32 py-5 rounded-full bg-surface-bright text-lg border-4 border-transparent focus:border-primary/25 outline-none placeholder:text-surface-on-variant/40 shadow-lg dark:shadow-black/40 transition-all"
          />
          <button
            disabled={status === 'loading'}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-7 py-3 rounded-full bg-primary text-primary-on font-black hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow"
          >
            {status === 'loading' ? '…' : 'Get'}
          </button>
        </form>

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
                  {all.length > 1 && (
                    <div className="px-4 pt-2 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-on-variant/50">Quality</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                        {all.map((f) => (
                          <button key={f.key} onClick={() => setSelected(f.key)}
                            className={`px-3 py-2.5 rounded-xl border-2 text-center transition ${
                              selected === f.key
                                ? 'bg-primary text-primary-on border-primary shadow'
                                : 'bg-surface-bright border-outline-variant/15 hover:border-primary/40'
                            }`}>
                            <div className="font-black text-sm truncate">{f.label}</div>
                            <div className="text-[9px] font-bold opacity-60 truncate">{f.detail || f.ext}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <button onClick={download} disabled={!active}
                      className="w-full py-4 rounded-2xl bg-primary text-primary-on font-black text-lg shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all">
                      DOWNLOAD ↓ <span className="opacity-70 text-sm font-bold">{active?.ext.toUpperCase()}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="pb-10 text-center text-xs font-black tracking-[0.4em] uppercase text-surface-on-variant/25">
        Toolz Downloadz Engine v4 · TikTok + Instagram
      </footer>
    </div>
  )
}
