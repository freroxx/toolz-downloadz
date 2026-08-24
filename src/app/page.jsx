'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('best')
  const [downloadState, setDownloadState] = useState('idle')

  // Advanced / tester controls (exposes full API capabilities)
  const [audioOnly, setAudioOnly] = useState(false)
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [includeSubtitles, setIncludeSubtitles] = useState(false)
  const [customFormat, setCustomFormat] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [history, setHistory] = useState([])
  const [health, setHealth] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [copied, setCopied] = useState('')

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('toolz_history') || '[]')
      setHistory(h.slice(0, 8))
    } catch {}
    // fetch health + platforms (non-blocking, tester only)
    fetch('/api/health').then(r=>r.json()).then(setHealth).catch(()=>{})
    fetch('/api/platforms').then(r=>r.json()).then(d=>setPlatforms(d.platforms||[])).catch(()=>{})
    // auto-fill from ?url= query for shareable links
    const sp = new URLSearchParams(window.location.search)
    const q = sp.get('url')
    if (q) setUrl(q)
  }, [])

  const pushHistory = (u, title) => {
    try {
      const next = [{ url: u, title: title || u, at: Date.now() }, ...history.filter(x=>x.url!==u)].slice(0,8)
      setHistory(next)
      localStorage.setItem('toolz_history', JSON.stringify(next))
    } catch {}
  }

  const handleExtract = async (e) => {
    e.preventDefault()
    if (!url) return

    setStatus('loading')
    setError('')
    setData(null)

    // update shareable URL without reload
    try { window.history.replaceState(null,'',`?url=${encodeURIComponent(url)}`) } catch {}

    const params = new URLSearchParams({ url })
    if (audioOnly) params.set('audio_only', 'true')
    if (isPlaylist) params.set('playlist', 'true')
    if (includeSubtitles) params.set('subtitles', 'true')
    if (customFormat.trim()) params.set('format', customFormat.trim())

    try {
      const response = await fetch(`/api/extract?${params.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.detail || 'Failed to extract media.')
        }
        setData(result)
        pushHistory(url, result.title)
        setSelected('best')
        setDownloadState('idle')
        setStatus('success')
      } else {
        throw new Error('Server returned an invalid response. Please try again later.')
      }
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatNumber = (num) => {
    if (num === 0) return '0'
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatBytes = (n) => {
    if (!n || n < 0) return null
    if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB'
    if (n >= 1024) return (n / 1024).toFixed(0) + ' KB'
    return n + ' B'
  }

  const formatDate = (raw) => {
    if (!raw || raw.length !== 8) return null
    const y = raw.slice(0, 4)
    const m = raw.slice(4, 6)
    const d = raw.slice(6, 8)
    return `${y}.${m}.${d}`
  }

  const safeName = (name) =>
    String(name || 'media').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)

  const downloadUrlFor = (fmt) => {
    const raw = fmt ? fmt.url : data?.download_url
    if (!raw) return '#'
    const ext = fmt ? fmt.ext : (data?.ext || 'mp4')
    const name = `${safeName(data?.title)}.${ext}` || 'media'
    const headers = fmt ? fmt.headers : (data?.download_headers || {})
    const params = new URLSearchParams({ url: raw, name })
    if (headers && Object.keys(headers).length > 0) {
      params.set('headers', btoa(unescape(encodeURIComponent(JSON.stringify(headers)))))
    }
    return `/api/download?${params.toString()}`
  }

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(''),1500)} catch {}
  }

  const formatOptions = useMemo(() => {
    if (!data || data.blocked) return { best: null, video: [], audio: [] }
    const video = (data.formats?.video || []).map((f, i) => ({
      key: `v${i}`,
      kind: 'video',
      url: f.url,
      ext: f.ext || 'mp4',
      headers: f.headers || {},
      label: `${f.resolution || 'Video'}`,
      detail: (f.acodec && f.acodec !== 'none' ? 'with audio' : 'video only') +
        (f.filesize ? ` · ${formatBytes(f.filesize)}` : ''),
    }))
    const audio = (data.formats?.audio || []).map((f, i) => ({
      key: `a${i}`,
      kind: 'audio',
      url: f.url,
      ext: f.ext || 'mp3',
      headers: f.headers || {},
      label: `${(f.resolution !== 'unknown' ? f.resolution : f.ext || 'audio').toUpperCase()} audio`,
      detail: f.filesize ? formatBytes(f.filesize) : '',
    }))
    return { best: data.download_url || null, video, audio }
  }, [data])

  const activeFormat = selected === 'best'
    ? { key: 'best', url: data?.download_url, ext: data?.ext || 'mp4', label: 'Best quality' }
    : formatOptions.video.concat(formatOptions.audio).find((f) => f.key === selected) || null

  const handleDownload = () => {
    if (!activeFormat?.url) return
    setDownloadState('downloading')
    window.location.href = downloadUrlFor(activeFormat.key === 'best' ? null : activeFormat)
    setDownloadState('done')
  }

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'youtube': return 'bg-[#FF0000] text-white'
      case 'tiktok': return 'bg-[#000000] text-white'
      case 'instagram': return 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white'
      case 'twitter': return 'bg-[#1DA1F2] text-white'
      case 'reddit': return 'bg-[#FF4500] text-white'
      case 'facebook': return 'bg-[#0866FF] text-white'
      case 'soundcloud': return 'bg-[#FF5500] text-white'
      case 'twitch': return 'bg-[#9146FF] text-white'
      case 'vimeo': return 'bg-[#1AB7EA] text-white'
      default: return 'bg-primary text-primary-on'
    }
  }

  const curlPreview = useMemo(()=>{
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const p = new URLSearchParams({ url: url || 'https://...' })
    if (audioOnly) p.set('audio_only','true')
    if (isPlaylist) p.set('playlist','true')
    if (includeSubtitles) p.set('subtitles','true')
    if (customFormat) p.set('format', customFormat)
    return `curl "${base}/api/extract?${p.toString()}"`
  }, [url, audioOnly, isPlaylist, includeSubtitles, customFormat])

  return (
    <div className="min-h-screen bg-surface-dim text-surface-on selection:bg-primary/30 font-sans transition-colors duration-500">
      {/* Docked Header Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-on font-black shadow-lg shadow-primary/20">
            TD
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Toolz Downloadz</span>
          {health && (
            <span className={`ml-3 hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${health.status==='online' ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${health.status==='online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              {health.status==='online' ? `API v${health.version}` : 'API offline'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={()=>setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 rounded-full font-black text-xs tracking-widest uppercase border transition ${showAdvanced ? 'bg-primary text-primary-on border-primary' : 'bg-surface-container-high text-surface-on border-outline-variant/20 hover:bg-primary/10'}`}
          >
            {showAdvanced ? 'Hide Tester' : '⚙️ Tester'}
          </button>
          <a
            href="https://github.com/freroxx/toolz-downloadz"
            target="_blank"
            className="hidden sm:inline-flex px-6 py-2.5 rounded-full bg-surface-container-highest text-surface-on font-bold text-sm hover:bg-primary/10 transition-all active:scale-95 border border-outline-variant/20"
          >
            GitHub
          </a>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-4 max-w-5xl mx-auto flex flex-col items-center gap-10 md:gap-14">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 md:space-y-6"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-primary leading-[0.85] filter drop-shadow-sm">
            Toolz<br />Downloadz
          </h1>
          <p className="text-base md:text-xl text-surface-on-variant font-medium max-w-2xl mx-auto opacity-90 leading-relaxed px-6">
            High-performance media downloader for the modern web.<br/>
            <span className="text-sm opacity-60">API Tester Edition — exhaustively test every extractor capability.</span>
          </p>
        </motion.div>

        {/* Hero Search Input */}
        <div className="w-full flex flex-col items-center gap-6">
          <motion.form
            onSubmit={handleExtract}
            className="w-full relative group max-w-3xl"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative flex flex-col md:flex-row items-center gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste link here... (YouTube, TikTok, IG, X, Reddit, SoundCloud...)"
                className="w-full pl-6 pr-6 md:pr-44 py-5 md:py-9 rounded-[2rem] md:rounded-full bg-surface-bright text-surface-on border-4 border-transparent focus:border-primary/20 focus:bg-surface-bright outline-none text-lg md:text-xl transition-all placeholder:text-surface-on-variant/30 shadow-xl dark:shadow-black/40"
              />
              <button
                disabled={status === 'loading'}
                className="w-full md:w-auto md:absolute md:right-4 px-10 py-4 md:py-5 rounded-[2rem] md:rounded-full bg-primary text-primary-on font-black text-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-lg"
              >
                {status === 'loading' ? '…' : 'Extract'}
              </button>
            </div>
          </motion.form>

          {/* Quick presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              ['YouTube Test', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
              ['SoundCloud', 'https://soundcloud.com/edsheeran/perfect'],
              ['Vimeo', 'https://vimeo.com/148751763'],
            ].map(([label, link]) => (
              <button key={label} onClick={()=>setUrl(link)} className="px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 text-xs font-bold hover:bg-primary/10 transition">
                {label}
              </button>
            ))}
            {history.length>0 && <span className="mx-2 text-surface-on-variant/30">|</span>}
            {history.slice(0,3).map(h=>(
              <button key={h.url} onClick={()=>setUrl(h.url)} className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold truncate max-w-[160px]">{h.title.slice(0,22)}</button>
            ))}
          </div>

          {/* Advanced Tester Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity:0, y:-8, height:0 }}
                animate={{ opacity:1, y:0, height:'auto' }}
                exit={{ opacity:0, y:-8, height:0 }}
                className="w-full max-w-3xl rounded-[2rem] bg-surface-container border border-outline-variant/10 p-6 md:p-8 space-y-6 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-black tracking-tight">API Tester — Full Capabilities</h3>
                  <span className="text-[10px] font-black tracking-widest uppercase opacity-40">All API flags exposed</span>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${audioOnly ? 'bg-primary text-primary-on border-primary' : 'bg-surface-bright border-outline-variant/10 hover:border-primary/30'}`}>
                    <input type="checkbox" checked={audioOnly} onChange={e=>setAudioOnly(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-black">Audio Only</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${isPlaylist ? 'bg-primary text-primary-on border-primary' : 'bg-surface-bright border-outline-variant/10 hover:border-primary/30'}`}>
                    <input type="checkbox" checked={isPlaylist} onChange={e=>setIsPlaylist(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-black">Playlist</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${includeSubtitles ? 'bg-primary text-primary-on border-primary' : 'bg-surface-bright border-outline-variant/10 hover:border-primary/30'}`}>
                    <input type="checkbox" checked={includeSubtitles} onChange={e=>setIncludeSubtitles(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-black">Subtitles</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black tracking-widest uppercase opacity-50">Custom yt-dlp format selector</label>
                  <input
                    value={customFormat}
                    onChange={e=>setCustomFormat(e.target.value)}
                    placeholder='e.g. bestvideo[height<=1080]+bestaudio/best or bestaudio'
                    className="w-full px-4 py-3 rounded-2xl bg-surface-bright border border-outline-variant/10 focus:border-primary/30 outline-none text-sm font-mono"
                  />
                  <p className="text-[10px] opacity-40">Leave empty for auto-best. Power users: any yt-dlp format string.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black tracking-widest uppercase opacity-50">cURL preview</label>
                    <button onClick={()=>copy(curlPreview,'curl')} className="text-xs font-black px-3 py-1 rounded-full bg-surface-bright border border-outline-variant/10 hover:bg-primary hover:text-primary-on transition">{copied==='curl'?'Copied!':'Copy'}</button>
                  </div>
                  <pre className="w-full p-4 rounded-2xl bg-[#0F0D13] text-[#E6E0E9] text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{curlPreview}</pre>
                </div>

                {platforms.length>0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black tracking-widest uppercase opacity-50">Supported platforms ({platforms.length}) — from /api/platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map(p=>(
                        <span key={p.id} className="px-3 py-1.5 rounded-full bg-surface-bright border border-outline-variant/10 text-[10px] font-black tracking-widest uppercase opacity-70">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {health && (
                  <div className="flex items-center gap-3 text-xs p-3 rounded-2xl bg-surface-bright border border-outline-variant/10">
                    <span className="font-mono opacity-60">GET /api/health</span>
                    <span className={`px-2 py-1 rounded-full font-black text-[10px] ${health.status==='online'?'bg-green-500 text-white':'bg-red-500 text-white'}`}>{health.status}</span>
                    <span className="opacity-40">v{health.version} · {health.environment} · {health.cache}</span>
                    <button onClick={()=>fetch('/api/health').then(r=>r.json()).then(setHealth)} className="ml-auto px-3 py-1 rounded-full bg-primary text-primary-on font-black text-[10px]">Refresh</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported Platforms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-2xl px-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-3 md:gap-4">
              {['YouTube','TikTok','Instagram','Twitter (X)','Reddit','Facebook','SoundCloud','Twitch','Vimeo','Pinterest'].map((platform) => (
                <div key={platform} className="flex items-center justify-center px-3 py-2 rounded-2xl bg-surface-container-high border border-outline-variant/10 shadow-sm">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-surface-on-variant opacity-70 text-center">
                    {platform}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Result Area */}
        <div className="w-full flex justify-center min-h-[300px]">
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col gap-8 max-w-3xl">
                <div className="w-full aspect-video bg-surface-container-high animate-pulse rounded-[3rem]" />
                <div className="space-y-4">
                  <div className="h-12 w-3/4 bg-surface-container-high animate-pulse rounded-2xl" />
                  <div className="h-8 w-1/2 bg-surface-container-high animate-pulse rounded-2xl" />
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl p-10 rounded-[3rem] bg-error-container text-error-onContainer border-4 border-error/10 flex flex-col items-center gap-6 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-error flex items-center justify-center text-error-on text-4xl font-black shadow-lg">!</div>
                <div className="space-y-2">
                  <h4 className="font-black text-3xl">Extraction Failed</h4>
                  <p className="text-lg opacity-80 max-w-md whitespace-pre-wrap break-words">{error}</p>
                  <p className="text-xs opacity-50 pt-2">Tip: try toggling Tester options — e.g. disable playlist, or add cookies for IG.</p>
                </div>
                <button onClick={() => setStatus('idle')} className="px-10 py-4 rounded-full bg-error text-error-on font-black hover:scale-105 transition-transform shadow-lg shadow-error/20">
                  Try Again
                </button>
              </motion.div>
            )}

            {status === 'success' && data && data.blocked && (
              <motion.div key="blocked" initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-4xl bg-surface-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-black/50 flex flex-col border border-outline-variant/10">
                <div className="flex flex-col lg:flex-row">
                  <div className="w-full lg:w-1/2 relative aspect-video lg:aspect-auto">
                    {data.thumbnail ? <img src={data.thumbnail} alt={data.title || ''} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-surface-container-highest flex items-center justify-center"><span className="text-6xl">▶</span></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className={`absolute top-4 left-4 md:top-8 md:left-8 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-2xl ${getPlatformColor(data.platform)}`}>{data.platform}</div>
                  </div>
                  <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col gap-6 md:gap-10 justify-between bg-surface-container-high/50">
                    <div className="space-y-4 md:space-y-6">
                      <div className="space-y-3 md:space-y-4">
                        <h3 className="text-2xl md:text-4xl font-black leading-[1.1] tracking-tighter text-surface-on line-clamp-3">{data.title}</h3>
                        {data.uploader && <a href={data.uploader_url} target="_blank" rel="noopener noreferrer" className="text-lg md:text-2xl text-primary font-black hover:underline flex items-center gap-2 md:gap-3 group"><span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-sm shadow-primary/40" />{data.uploader}</a>}
                      </div>
                      <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-tertiary-container text-tertiary-onContainer border border-tertiary/20 flex gap-3 md:gap-4 items-start"><span className="text-xl md:text-2xl">⚠</span><p className="text-sm md:text-base font-bold leading-relaxed">{data.blocked_message}</p></div>
                    </div>
                    <a href={url || data.uploader_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 md:gap-4 py-5 md:py-8 rounded-2xl md:rounded-[2.5rem] bg-tertiary text-tertiary-on font-black text-lg md:text-2xl shadow-2xl shadow-tertiary/30 hover:shadow-tertiary/50 hover:-translate-y-1 transition-all active:scale-95">OPEN ON SOURCE<span className="text-xl md:text-3xl">↗</span></a>
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'success' && data && !data.blocked && (
              <motion.div key="success" initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-4xl bg-surface-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-black/50 flex flex-col border border-outline-variant/10">
                {/* Media Section */}
                <div className="flex flex-col lg:flex-row">
                  <div className="w-full lg:w-1/2 relative aspect-video lg:aspect-auto">
                    <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/20" />
                    {data.duration && <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 px-3 md:px-5 py-1 md:py-2 bg-black/80 backdrop-blur-xl text-white text-[10px] md:text-sm font-black rounded-xl md:rounded-2xl border border-white/10 shadow-2xl">{formatDuration(data.duration)}</div>}
                    <div className={`absolute top-4 left-4 md:top-8 md:left-8 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-2xl ${getPlatformColor(data.platform)}`}>{data.platform}</div>
                    {data._cached && <div className="absolute top-4 right-4 md:top-8 md:right-8 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-black tracking-widest uppercase">CACHED</div>}
                  </div>
                  <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col gap-6 md:gap-10 justify-between bg-surface-container-high/50">
                    <div className="space-y-6 md:space-y-8">
                      <div className="space-y-3 md:space-y-4">
                        <h3 className="text-2xl md:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tighter text-surface-on line-clamp-3">{data.title}</h3>
                        <a href={data.uploader_url} target="_blank" rel="noopener noreferrer" className="text-lg md:text-2xl text-primary font-black hover:underline flex items-center gap-2 md:gap-3 group"><span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-sm shadow-primary/40" />{data.uploader}</a>
                        {data.description && <p className="text-sm opacity-60 line-clamp-3 leading-relaxed">{data.description.slice(0,240)}</p>}
                      </div>
                      {(() => {
                        const chips = []
                        const push = (label, value) => { if (value !== null && value !== undefined) chips.push({ label, value }) }
                        push('Views', data.stats?.views)
                        push('Likes', data.stats?.likes ?? data.like_count)
                        push('Comments', data.stats?.comments ?? data.comment_count)
                        push('Reposts', data.stats?.reposts)
                        let extra = ''
                        const d = formatDate(data.upload_date)
                        if (d) extra = `Published ${d}`
                        if (data.playlist_count) extra += (extra?' · ':'') + `Playlist ${data.playlist_count} items`
                        return (
                          <div className="w-full space-y-3">
                            <div className={`grid gap-2 md:gap-3 ${chips.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                              {chips.map((s, i) => (
                                <div key={i} className="p-3 md:p-5 rounded-2xl md:rounded-[2.5rem] bg-surface-bright border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-sm">
                                  <span className="text-[8px] md:text-[10px] font-black text-surface-on-variant opacity-40 uppercase tracking-[0.2em] mb-1">{s.label}</span>
                                  <span className="text-base md:text-2xl font-black text-surface-on tracking-tight">{formatNumber(s.value)}</span>
                                </div>
                              ))}
                            </div>
                            {extra && <div className="text-center"><span className="text-xs md:text-sm font-black text-surface-on-variant opacity-50 uppercase tracking-[0.2em]">{extra}</span></div>}
                          </div>
                        )
                      })()}
                      {/* Playlist preview */}
                      {data.playlist_entries && data.playlist_entries.length>0 && (
                        <div className="space-y-2 p-4 rounded-2xl bg-surface-bright border border-outline-variant/10">
                          <p className="text-[10px] font-black tracking-widest uppercase opacity-40">Playlist — first {data.playlist_entries.length} / {data.entries_total || data.playlist_count}</p>
                          <div className="space-y-2 max-h-40 overflow-auto pr-2">
                            {data.playlist_entries.map((e,i)=>(
                              <div key={i} className="flex gap-3 items-center text-xs">
                                <img src={e.thumbnail} alt="" className="w-12 h-8 object-cover rounded-lg bg-surface-container-high" />
                                <span className="font-bold line-clamp-1 flex-1">{e.title}</span>
                                {e.duration && <span className="opacity-40 font-mono text-[10px]">{formatDuration(e.duration)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Subtitles */}
                      {data.subtitles && Object.keys(data.subtitles).length>0 && (
                        <div className="p-4 rounded-2xl bg-surface-bright border border-outline-variant/10">
                          <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mb-2">Subtitles available: {Object.keys(data.subtitles).join(', ')}</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(data.subtitles).slice(0,6).map(([lang, tracks])=>(
                              <span key={lang} className="px-3 py-1 rounded-full bg-secondary-container text-secondary-onContainer text-xs font-bold">{lang} · {Array.isArray(tracks)?tracks.length:1}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <button onClick={handleDownload} disabled={!activeFormat?.url || downloadState === 'downloading'} className="flex items-center justify-center gap-3 md:gap-4 py-5 md:py-8 rounded-2xl md:rounded-[2.5rem] bg-primary text-primary-on font-black text-lg md:text-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50">
                        {downloadState === 'downloading' ? 'STARTING…' : 'DOWNLOAD'}
                        <span className="text-xl md:text-3xl">↓</span>
                      </button>
                      {activeFormat && <div className="text-center text-xs md:text-sm font-black text-primary tracking-[0.2em] uppercase opacity-70">{activeFormat.label}</div>}
                      <div className="flex gap-2 justify-center">
                        <button onClick={()=>copy(data.title||'', 'title')} className="px-3 py-1.5 rounded-full bg-surface-bright border border-outline-variant/10 text-xs font-bold hover:bg-primary/10">{copied==='title'?'Copied!':'Copy Title'}</button>
                        <button onClick={()=>copy(data.webpage_url||url,'link')} className="px-3 py-1.5 rounded-full bg-surface-bright border border-outline-variant/10 text-xs font-bold hover:bg-primary/10">{copied==='link'?'Copied!':'Copy Link'}</button>
                        <button onClick={()=>setShowRaw(!showRaw)} className={`px-3 py-1.5 rounded-full border text-xs font-black ${showRaw ? 'bg-primary text-primary-on border-primary':'bg-surface-bright border-outline-variant/10'}`}>{showRaw?'Hide Raw':'Show Raw JSON'}</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Picker */}
                <div className="p-6 md:p-12 lg:p-16 bg-surface-container-highest/30 border-t border-outline-variant/10 space-y-8 md:space-y-12">
                  {(formatOptions.video.length > 0 || formatOptions.audio.length > 0) && (
                    <div className="space-y-6 md:space-y-8">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="h-[1px] md:h-[2px] flex-1 bg-outline-variant/10" />
                        <h4 className="text-[10px] md:text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.3em] md:tracking-[0.4em]">Quality & Formats</h4>
                        <div className="h-[1px] md:h-[2px] flex-1 bg-outline-variant/10" />
                      </div>
                      {formatOptions.best && (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] md:text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.25em]">Recommended</p>
                          <button onClick={() => setSelected('best')} className={`text-left px-5 md:px-8 py-4 md:py-6 rounded-2xl md:rounded-[2rem] flex items-center justify-between gap-4 transition-all border-2 ${selected === 'best' ? 'bg-primary text-primary-on border-primary shadow-xl shadow-primary/20 scale-[1.01]' : 'bg-surface-bright text-surface-on border-outline-variant/10 hover:border-primary/40 shadow-sm'}`}>
                            <span className="font-black text-base md:text-xl tracking-tight">Best quality</span>
                            <span className="text-sm md:text-base font-black opacity-60">MP4 · auto</span>
                          </button>
                        </div>
                      )}
                      {formatOptions.video.length > 0 && (
                        <div className="flex flex-col gap-3 md:gap-4">
                          <p className="text-[10px] md:text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.25em]">Video Formats</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                            {formatOptions.video.slice(0, 12).map((f) => (
                              <button key={f.key} onClick={() => setSelected(f.key)} className={`px-4 py-3 md:px-6 md:py-5 rounded-xl md:rounded-[1.8rem] border-2 text-center transition-all group ${selected === f.key ? 'bg-primary text-primary-on border-primary shadow-lg shadow-primary/20 scale-[1.03]' : 'bg-surface-bright text-surface-on border-outline-variant/10 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm'}`}>
                                <div className="text-[8px] md:text-[10px] font-black opacity-40 mb-1 tracking-widest uppercase">{f.ext}</div>
                                <div className="font-black text-base md:text-lg tracking-tighter">{f.label}</div>
                                {f.detail && <div className="text-[9px] md:text-xs font-bold opacity-60 mt-1">{f.detail}</div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {formatOptions.audio.length > 0 && (
                        <div className="flex flex-col gap-3 md:gap-4">
                          <p className="text-[10px] md:text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.25em]">Audio Only</p>
                          <div className="flex flex-wrap gap-2 md:gap-4">
                            {formatOptions.audio.slice(0, 6).map((f) => (
                              <button key={f.key} onClick={() => setSelected(f.key)} className={`px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg flex items-center gap-3 md:gap-4 transition-all ${selected === f.key ? 'bg-secondary text-secondary-on shadow-xl shadow-secondary/20' : 'bg-secondary-container text-secondary-onContainer hover:bg-secondary hover:text-secondary-on'}`}>
                                <span className="text-xl md:text-2xl">♫</span>
                                <span>{f.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw JSON */}
                  {showRaw && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black tracking-widest uppercase opacity-40">Raw API Response — for debugging / tester</p>
                        <button onClick={()=>copy(JSON.stringify(data,null,2),'raw')} className="px-3 py-1 rounded-full bg-surface-bright border border-outline-variant/10 text-xs font-black">{copied==='raw'?'Copied!':'Copy JSON'}</button>
                      </div>
                      <pre className="w-full p-4 rounded-2xl bg-[#0F0D13] text-[#E6E0E9] text-xs font-mono overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="py-12 text-center space-y-6">
        <div className="text-surface-on-variant/20 text-sm font-black tracking-[0.6em] uppercase">Toolz Downloadz Engine v2.0</div>
        <p className="text-sm text-surface-on-variant/40 font-bold max-w-xl mx-auto px-8 leading-relaxed">
          High-performance media bridge — 20+ platforms, 100% API coverage via Tester.<br />
          Open source and free forever. Use responsibly — only download content you have rights to.
        </p>
      </footer>
    </div>
  )
}
