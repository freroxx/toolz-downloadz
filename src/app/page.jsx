'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const handleExtract = async (e) => {
    e.preventDefault()
    if (!url) return

    setStatus('loading')
    setError('')
    setData(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/extract?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': process.env.NEXT_PUBLIC_API_SECRET_KEY || 'dmtPYMX9fBH0VinH2dPf2tFsuET1Gz6Cu5MKyHhbunE',
        },
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to extract media. Please check the URL.')
      }

      const result = await response.json()
      setData(result)
      setStatus('success')
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

      <main className="pt-36 pb-24 px-4 max-w-5xl mx-auto flex flex-col items-center gap-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-container text-primary-onContainer text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            M3 Expressive v1.1.0
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-primary leading-[0.85] filter drop-shadow-sm">
            Media.<br />Expressive.
          </h1>
          <p className="text-xl md:text-2xl text-surface-on-variant font-medium max-w-2xl mx-auto opacity-80 leading-relaxed">
            Universal media extraction for the modern web. High-performance, secure, and beautiful.
          </p>
        </motion.div>

        {/* Hero Search Input (Large Pill) */}
        <motion.form
          onSubmit={handleExtract}
          className="w-full relative group max-w-3xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 15 }}
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste link from YouTube, TikTok, X, etc..."
              className="w-full pl-10 pr-44 py-9 rounded-full bg-surface-bright text-surface-on border-4 border-transparent focus:border-primary/20 focus:bg-surface-bright focus:shadow-[0_0_80px_-20px_rgba(103,80,164,0.15)] outline-none text-xl md:text-2xl transition-all placeholder:text-surface-on-variant/30 shadow-2xl dark:shadow-black/40"
            />
            <button
              disabled={status === 'loading'}
              className="absolute right-4 px-12 py-5 rounded-full bg-primary text-primary-on font-black text-lg hover:scale-[1.05] active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-primary/30"
            >
              {status === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-4 border-primary-on/30 border-t-primary-on rounded-full animate-spin" />
                  <span>...</span>
                </div>
              ) : 'Extract'}
            </button>
          </div>
        </motion.form>

        {/* Result Area */}
        <div className="w-full flex justify-center min-h-[500px]">
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

            {status === 'success' && data && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-4xl bg-surface-container rounded-[4rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-black/50 flex flex-col border border-outline-variant/10"
              >
                {/* Media Section */}
                <div className="flex flex-col lg:flex-row">
                  {/* Thumbnail & Preview */}
                  <div className="w-full lg:w-1/2 relative aspect-square lg:aspect-auto">
                    <img
                      src={data.thumbnail}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/20" />

                    {data.duration && (
                      <div className="absolute bottom-8 left-8 px-5 py-2 bg-black/80 backdrop-blur-xl text-white text-sm font-black rounded-2xl border border-white/10 shadow-2xl">
                        {formatDuration(data.duration)}
                      </div>
                    )}

                    <div className={`absolute top-8 left-8 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.25em] shadow-2xl ${getPlatformColor(data.platform)}`}>
                      {data.platform}
                    </div>
                  </div>

                  {/* Info & Stats */}
                  <div className="w-full lg:w-1/2 p-12 lg:p-16 flex flex-col gap-10 justify-between bg-surface-container-high/50">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tighter text-surface-on line-clamp-3">
                          {data.title}
                        </h3>
                        <a
                          href={data.uploader_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-primary font-black hover:underline flex items-center gap-3 group"
                        >
                          <span className="w-3 h-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-sm shadow-primary/40" />
                          {data.uploader}
                        </a>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {data.stats.views !== null && (
                          <div className="p-5 rounded-[2.5rem] bg-surface-bright border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-sm">
                            <span className="text-[10px] font-black text-surface-on-variant opacity-40 uppercase tracking-[0.2em] mb-1">Views</span>
                            <span className="text-2xl font-black text-surface-on tracking-tight">{formatNumber(data.stats.views)}</span>
                          </div>
                        )}
                        {data.stats.likes !== null && (
                          <div className="p-5 rounded-[2.5rem] bg-surface-bright border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-sm">
                            <span className="text-[10px] font-black text-surface-on-variant opacity-40 uppercase tracking-[0.2em] mb-1">Likes</span>
                            <span className="text-2xl font-black text-surface-on tracking-tight">{formatNumber(data.stats.likes)}</span>
                          </div>
                        )}
                        {data.stats.comments !== null && (
                          <div className="p-5 rounded-[2.5rem] bg-surface-bright border border-outline-variant/10 flex flex-col items-center justify-center text-center shadow-sm">
                            <span className="text-[10px] font-black text-surface-on-variant opacity-40 uppercase tracking-[0.2em] mb-1">Talk</span>
                            <span className="text-2xl font-black text-surface-on tracking-tight">{formatNumber(data.stats.comments)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Main Actions */}
                    <div className="flex flex-col gap-5">
                      <a
                        href={data.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-4 py-8 rounded-[2.5rem] bg-primary text-primary-on font-black text-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0"
                      >
                        DOWNLOAD BEST
                        <span className="text-3xl">↓</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Secondary Actions (Formats) */}
                <div className="p-12 lg:p-16 bg-surface-container-highest/30 border-t border-outline-variant/10 space-y-12">
                  {/* Video Formats */}
                  {data.formats.video && data.formats.video.length > 0 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="h-[2px] flex-1 bg-outline-variant/10" />
                        <h4 className="text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.4em]">Video Formats</h4>
                        <div className="h-[2px] flex-1 bg-outline-variant/10" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {data.formats.video.slice(0, 8).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            className="px-6 py-5 rounded-[2rem] bg-surface-bright border border-outline-variant/10 text-surface-on text-center transition-all hover:bg-primary hover:text-primary-on hover:border-transparent group shadow-sm hover:shadow-xl hover:-translate-y-1"
                          >
                            <div className="text-[10px] font-black opacity-30 group-hover:opacity-60 mb-1 tracking-widest">{f.ext.toUpperCase()}</div>
                            <div className="font-black text-xl tracking-tighter">{f.resolution}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio Formats */}
                  {data.formats.audio && data.formats.audio.length > 0 && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="h-[2px] flex-1 bg-outline-variant/10" />
                        <h4 className="text-xs font-black text-surface-on-variant opacity-40 uppercase tracking-[0.4em]">Audio Only</h4>
                        <div className="h-[2px] flex-1 bg-outline-variant/10" />
                      </div>
                      <div className="flex flex-wrap justify-center gap-4">
                        {data.formats.audio.slice(0, 4).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            className="px-10 py-5 rounded-[2rem] bg-secondary-container text-secondary-onContainer font-black text-lg flex items-center gap-4 hover:scale-105 transition-all shadow-lg shadow-secondary/10"
                          >
                            <span className="text-2xl">♫</span>
                            {f.resolution !== 'unknown' ? f.resolution : `${f.ext.toUpperCase()} Audio`}
                          </a>
                        ))}
                      </div>
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


