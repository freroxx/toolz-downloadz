'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('best') // 'best' | format index key
  const [downloadState, setDownloadState] = useState('idle') // idle, downloading, done

  const handleExtract = async (e) => {
    e.preventDefault()
    if (!url) return

    setStatus('loading')
    setError('')
    setData(null)

    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.detail || 'Failed to extract media.')
        }
        setData(result)
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
    return `/api/download?url=${encodeURIComponent(raw)}&name=${encodeURIComponent(name)}`
  }

  // Build a quality-ready list combining best, video and audio formats.
  const formatOptions = useMemo(() => {
    if (!data || data.blocked) return { best: null, video: [], audio: [] }
    const video = (data.formats?.video || []).map((f, i) => ({
      key: `v${i}`,
      kind: 'video',
      url: f.url,
      ext: f.ext || 'mp4',
      label: `${f.resolution || 'Video'}`,
      detail: (f.acodec && f.acodec !== 'none' ? 'with audio' : 'video only') +
        (f.filesize ? ` · ${formatBytes(f.filesize)}` : ''),
    }))
    const audio = (data.formats?.audio || []).map((f, i) => ({
      key: `a${i}`,
      kind: 'audio',
      url: f.url,
      ext: f.ext || 'mp3',
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
    // Delegate to the same-origin proxy route which streams with Content-Disposition: attachment.
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
      default: return 'bg-primary text-primary-on'
    }
  }

  return (
    <div className="min-h-screen bg-surface-dim text-surface-on selection:bg-primary/30 font-sans transition-colors duration-500">
      {/* Docked Header Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-on font-black shadow-lg shadow-primary/20">
            TD
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Toolz Downloadz</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/freroxx/toolz-downloadz"
            target="_blank"
            className="px-6 py-2.5 rounded-full bg-surface-container-highest text-surface-on font-bold text-sm hover:bg-primary/10 transition-all active:scale-95 border border-outline-variant/20"
          >
            GitHub
          </a>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-4 max-w-5xl mx-auto flex flex-col items-center gap-10 md:gap-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 md:space-y-6"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-primary leading-[0.85] filter drop-shadow-sm">
            Toolz<br />Downloadz
          </h1>
          <p className="text-base md:text-2xl text-surface-on-variant font-medium max-w-2xl mx-auto opacity-90 leading-relaxed px-6">
            High-performance media downloader for the modern web.
          </p>
        </motion.div>

        {/* Hero Search Input (Mobile Optimized) */}
        <div className="w-full flex flex-col items-center gap-10">
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
                placeholder="Paste link here..."
                className="w-full pl-6 pr-6 md:pr-44 py-5 md:py-9 rounded-[2rem] md:rounded-full bg-surface-bright text-surface-on border-4 border-transparent focus:border-primary/20 focus:bg-surface-bright outline-none text-lg md:text-2xl transition-all placeholder:text-surface-on-variant/30 shadow-xl dark:shadow-black/40"
              />
              <button
                disabled={status === 'loading'}
                className="w-full md:w-auto md:absolute md:right-4 px-10 py-4 md:py-5 rounded-[2rem] md:rounded-full bg-primary text-primary-on font-black text-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-lg"
              >
                {status === 'loading' ? '...' : 'Extract'}
              </button>
            </div>
          </motion.form>

          {/* Supported Platforms (Mobile Friendly) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl px-4"
          >
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-3 md:gap-6">
              {['YouTube', 'TikTok', 'Instagram', 'Twitter (X)', 'Reddit'].map((platform) => (
                <div key={platform} className="flex items-center justify-center px-4 py-3 rounded-2xl bg-surface-container-high border border-outline-variant/10 shadow-sm">
                  <span className="text-[9px] md:text-xs font-black uppercase tracking-widest text-surface-on-variant opacity-70 text-center">
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
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col gap-8 max-w-3xl"
              >
                <div className="w-full aspect-video bg-surface-container-high animate-pulse rounded-[3rem]" />
                <div className="space-y-4">
                  <div className="h-12 w-3/4 bg-surface-container-high animate-pulse rounded-2xl" />
                  <div className="h-8 w-1/2 bg-surface-container-high animate-pulse rounded-2xl" />
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl p-10 rounded-[3rem] bg-error-container text-error-onContainer border-4 border-error/10 flex flex-col items-center gap-6 text-center shadow-2xl"
              >
                <div className="w-20 h-20 rounded-full bg-error flex items-center justify-center text-error-on text-4xl font-black shadow-lg">!</div>
                <div className="space-y-2">
                  <h4 className="font-black text-3xl">Extraction Failed</h4>
                  <p className="text-lg opacity-80 max-w-md">{error}</p>
                </div>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-10 py-4 rounded-full bg-error text-error-on font-black hover:scale-105 transition-transform shadow-lg shadow-error/20"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {status === 'success' && data && data.blocked && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-4xl bg-surface-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-black/50 flex flex-col border border-outline-variant/10"
              >
                <div className="flex flex-col lg:flex-row">
                  <div className="w-full lg:w-1/2 relative aspect-video lg:aspect-auto">
                    {data.thumbnail ? (
                      <img
                        src={data.thumbnail}
                        alt={data.title || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                        <span className="text-6xl">▶</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className={`absolute top-4 left-4 md:top-8 md:left-8 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-2xl ${getPlatformColor(data.platform)}`}>
                      {data.platform}
                    </div>
                  </div>

                  <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col gap-6 md:gap-10 justify-between bg-surface-container-high/50">
                    <div className="space-y-4 md:space-y-6">
                      <div className="space-y-3 md:space-y-4">
                        <h3 className="text-2xl md:text-4xl font-black leading-[1.1] tracking-tighter text-surface-on line-clamp-3">
                          {data.title}
                        </h3>
                        {data.uploader && (
                          <a
                            href={data.uploader_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg md:text-2xl text-primary font-black hover:underline flex items-center gap-2 md:gap-3 group"
                          >
                            <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-sm shadow-primary/40" />
                            {data.uploader}
                          </a>
                        )}
                      </div>

                      <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-tertiary-container text-tertiary-onContainer border border-tertiary/20 flex gap-3 md:gap-4 items-start">
                        <span className="text-xl md:text-2xl">⚠</span>
                        <p className="text-sm md:text-base font-bold leading-relaxed">
                          {data.blocked_message}
                        </p>
                      </div>
                    </div>

                    <a
                      href={url || data.uploader_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 md:gap-4 py-5 md:py-8 rounded-2xl md:rounded-[2.5rem] bg-tertiary text-tertiary-on font-black text-lg md:text-2xl shadow-2xl shadow-tertiary/30 hover:shadow-tertiary/50 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0"
                    >
                      OPEN ON SOURCE
                      <span className="text-xl md:text-3xl">↗</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'success' && data && !data.blocked && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-4xl bg-surface-container rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-black/50 flex flex-col border border-outline-variant/10"
              >
                {/* Media Section */}
                <div className="flex flex-col lg:flex-row">
                  {/* Thumbnail & Preview */}
                  <div className="w-full lg:w-1/2 relative aspect-video lg:aspect-auto">
                    <img
                      src={data.thumbnail}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/20" />

                    {data.duration && (
                      <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 px-3 md:px-5 py-1 md:py-2 bg-black/80 backdrop-blur-xl text-white text-[10px] md:text-sm font-black rounded-xl md:rounded-2xl border border-white/10 shadow-2xl">
                        {formatDuration(data.duration)}
                      </div>
                    )}

                    <div className={`absolute top-4 left-4 md:top-8 md:left-8 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.25em] shadow-2xl ${getPlatformColor(data.platform)}`}>
                      {data.platform}
                    </div>
                  </div>

                  {/* Info & Stats */}
                  <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col gap-6 md:gap-10 justify-between bg-surface-container-high/50">
                    <div className="space-y-6 md:space-y-8">
                      <div className="space-y-3 md:space-y-4">
                        <h3 className="text-2xl md:text-4xl lg:text-5xl font-black leading-[1.1] tracking-tighter text-surface-on line-clamp-3">
                          {data.title}
                        </h3>
                        <a
                          href={data.uploader_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg md:text-2xl text-primary font-black hover:underline flex items-center gap-2 md:gap-3 group"
                        >
                          <span className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-sm shadow-primary/40" />
                          {data.uploader}
                        </a>
                      </div>

                      {/* Stats Grid */}
                      {(() => {
                        const chips = []
                        const push = (label, value) => {
                          if (value !== null && value !== undefined) chips.push({ label, value })
                        }
                        push('Views', data.stats?.views)
                        push('Likes', data.stats?.likes)
                        push('Comments', data.stats?.comments)
                        push('Reposts', data.stats?.reposts)
                        let extra = ''
                        const d = formatDate(data.upload_date)
                        if (d) extra = `Published ${d}`
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
                            {extra && (
                              <div className="text-center">
                                <span className="text-xs md:text-sm font-black text-surface-on-variant opacity-50 uppercase tracking-[0.2em]">{extra}</span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Main Actions */}
                    <div className="flex flex-col gap-4">
                      <button
                        onClick={handleDownload}
                        disabled={!activeFormat?.url || downloadState === 'downloading'}
                        className="flex items-center justify-center gap-3 md:gap-4 py-5 md:py-8 rounded-2xl md:rounded-[2.5rem] bg-primary text-primary-on font-black text-lg md:text-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {downloadState === 'downloading' ? 'STARTING…' : 'DOWNLOAD'}
                        <span className="text-xl md:text-3xl">↓</span>
                      </button>
                      {activeFormat && (
                        <div className="text-center text-xs md:text-sm font-black text-primary tracking-[0.2em] uppercase opacity-70">
                          {activeFormat.label}
                        </div>
                      )}
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
                          <button
                            onClick={() => setSelected('best')}
                            className={`text-left px-5 md:px-8 py-4 md:py-6 rounded-2xl md:rounded-[2rem] flex items-center justify-between gap-4 transition-all border-2 ${
                              selected === 'best'
                                ? 'bg-primary text-primary-on border-primary shadow-xl shadow-primary/20 scale-[1.01]'
                                : 'bg-surface-bright text-surface-on border-outline-variant/10 hover:border-primary/40 shadow-sm'
                            }`}
                          >
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
                              <button
                                key={f.key}
                                onClick={() => setSelected(f.key)}
                                className={`px-4 py-3 md:px-6 md:py-5 rounded-xl md:rounded-[1.8rem] border-2 text-center transition-all group ${
                                  selected === f.key
                                    ? 'bg-primary text-primary-on border-primary shadow-lg shadow-primary/20 scale-[1.03]'
                                    : 'bg-surface-bright text-surface-on border-outline-variant/10 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm'
                                }`}
                              >
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
                              <button
                                key={f.key}
                                onClick={() => setSelected(f.key)}
                                className={`px-6 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg flex items-center gap-3 md:gap-4 transition-all ${
                                  selected === f.key
                                    ? 'bg-secondary text-secondary-on shadow-xl shadow-secondary/20'
                                    : 'bg-secondary-container text-secondary-onContainer hover:bg-secondary hover:text-secondary-on'
                                }`}
                              >
                                <span className="text-xl md:text-2xl">♫</span>
                                <span>{f.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-24 text-center space-y-6">
        <div className="text-surface-on-variant/20 text-sm font-black tracking-[0.6em] uppercase">
          Toolz Downloadz Engine
        </div>
        <p className="text-sm text-surface-on-variant/40 font-bold max-w-xl mx-auto px-8 leading-relaxed">
          A high-performance media bridge built for the modern web.<br />
          Open source and free forever.
        </p>
      </footer>
    </div>
  )
}


