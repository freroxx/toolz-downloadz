'use client'

import { useState, useEffect } from 'react'

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', style: 'bg-[#FF0000] text-white' },
  { id: 'tiktok', name: 'TikTok', style: 'bg-black text-white' },
  { id: 'instagram', name: 'Instagram Reels', style: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white' },
]

const platformStyle = (p) =>
  PLATFORMS.find((x) => x.id === p)?.style ?? 'bg-primary text-primary-on'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
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
      url: f.url,
      ext: f.ext || (kind === 'audio' ? 'mp3' : 'mp4'),
      headers: f.headers || {},
      label: f.resolution !== 'unknown' ? f.resolution : f.ext?.toUpperCase() || kind,
      detail:
        (kind === 'video' && f.acodec && f.acodec !== 'none' ? '' : kind === 'video' ? 'no audio · ' : '') +
        (f.filesize ? fmtBytes(f.filesize) : ''),
    })
    return {
      best: data.download_url
        ? { key: 'best', url: data.download_url, ext: data.ext || 'mp4', headers: data.download_headers || {}, label: 'Best quality', detail: 'recommended' }
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
    const p = new URLSearchParams({ url: active.url, name: `${safeName(data.title || 'media')}.${active.ext}` })
    if (Object.keys(active.headers).length)
      p.set('headers', btoa(unescape(encodeURIComponent(JSON.stringify(active.headers)))))
    window.location.href = `/api/download?${p}`
  }

  return (
    <div className="min-h-screen bg-surface-dim text-surface-on selection:bg-primary/30 font-sans">
      {/* Top bar */}
      

      <main className="pt-28 pb-16 px-4 max-w-2xl mx-auto flex flex-col items-center gap-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-primary leading-none">
            Downloadz
          </h1>
          <p className="text-surface-on-variant font-medium">Paste a link. Get the video. That's it.</p>
        </div>

        {status==="loading" && <div/>}</main>

      <footer className="pb-10 text-center text-xs font-black tracking-[0.4em] uppercase text-surface-on-variant/25">
        Toolz Downloadz Engine v3
      </footer>
    </div>
  )
}
