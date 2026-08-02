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
    <div className="min-h-screen bg-surface text-surface-on selection:bg-primary/30 font-sans">
      {/* Docked Header Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-surface/80 backdrop-blur-xl border-b border-surface-variant/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-on font-black shadow-lg shadow-primary/20">
            TD
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Toolz Downloadz</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/toolz-downloadz/api"
            target="_blank"
            className="px-5 py-2.5 rounded-2xl bg-surface-variant text-surface-onVariant text-sm font-bold hover:bg-surface-onVariant/10 transition-all active:scale-95"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            V1.1.0 Cross-Platform
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-primary leading-[0.85] filter drop-shadow-sm">
            Fast.<br />Expressive.
          </h1>
          <p className="text-xl md:text-2xl text-surface-onVariant font-medium max-w-2xl mx-auto opacity-80">
            Universal media extraction for YouTube, TikTok, Instagram, and more. Optimized for speed and quality.
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
              className="w-full pl-10 pr-44 py-8 rounded-[2.5rem] bg-surface-variant/50 backdrop-blur-sm text-surface-onVariant border-4 border-transparent focus:border-primary/20 focus:bg-surface focus:shadow-[0_0_80px_-20px_rgba(103,80,164,0.15)] outline-none text-xl md:text-2xl transition-all placeholder:text-surface-onVariant/30 shadow-2xl"
            />
            <button
              disabled={status === 'loading'}
              className="absolute right-4 px-12 py-5 rounded-[2rem] bg-primary text-primary-on font-black text-lg hover:scale-[1.05] active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-primary/30"
            >
              {status === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-4 border-primary-on/30 border-t-primary-on rounded-full animate-spin" />
                  <span>...</span>
                </div>
              ) : 'Download'}
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
                <div className="w-full aspect-video bg-surface-variant/50 animate-pulse rounded-[3rem]" />
                <div className="space-y-4">
                  <div className="h-12 w-3/4 bg-surface-variant/50 animate-pulse rounded-2xl" />
                  <div className="h-8 w-1/2 bg-surface-variant/50 animate-pulse rounded-2xl" />
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl p-10 rounded-[2.5rem] bg-error-container text-error-onContainer border-4 border-error/10 flex flex-col items-center gap-6 text-center shadow-2xl"
              >
                <div className="w-20 h-20 rounded-full bg-error flex items-center justify-center text-error-on text-4xl font-black shadow-lg">!</div>
                <div className="space-y-2">
                  <h4 className="font-black text-3xl">Extraction Failed</h4>
                  <p className="text-lg opacity-80 max-w-md">{error}</p>
                </div>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-8 py-3 rounded-2xl bg-error text-error-on font-bold hover:scale-105 transition-transform"
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
                className="w-full max-w-4xl bg-surface-variant/30 backdrop-blur-md rounded-[3.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col border border-white/10"
              >
                {/* Media Section */}
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail & Preview */}
                  <div className="w-full md:w-1/2 relative aspect-square md:aspect-auto">
                    <img
                      src={data.thumbnail}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/10" />

                    {data.duration && (
                      <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/80 backdrop-blur-md text-white text-sm font-black rounded-2xl border border-white/10">
                        {formatDuration(data.duration)}
                      </div>
                    )}

                    <div className={`absolute top-6 left-6 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-2xl ${getPlatformColor(data.platform)}`}>
                      {data.platform}
                    </div>
                  </div>

                  {/* Info & Stats */}
                  <div className="w-full md:w-1/2 p-10 md:p-12 flex flex-col gap-8 justify-between bg-surface/40">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-surface-on line-clamp-3">
                          {data.title}
                        </h3>
                        <a
                          href={data.uploader_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-primary font-bold hover:underline flex items-center gap-2 group"
                        >
                          <span className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                          {data.uploader}
                        </a>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {data.stats.views !== null && (
                          <div className="p-4 rounded-3xl bg-surface/60 border border-surface-variant/50 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-black text-surface-onVariant/40 uppercase tracking-widest mb-1">Views</span>
                            <span className="text-xl font-black text-surface-on">{formatNumber(data.stats.views)}</span>
                          </div>
                        )}
                        {data.stats.likes !== null && (
                          <div className="p-4 rounded-3xl bg-surface/60 border border-surface-variant/50 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-black text-surface-onVariant/40 uppercase tracking-widest mb-1">Likes</span>
                            <span className="text-xl font-black text-surface-on">{formatNumber(data.stats.likes)}</span>
                          </div>
                        )}
                        {data.stats.comments !== null && (
                          <div className="p-4 rounded-3xl bg-surface/60 border border-surface-variant/50 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-black text-surface-onVariant/40 uppercase tracking-widest mb-1">Talk</span>
                            <span className="text-xl font-black text-surface-on">{formatNumber(data.stats.comments)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Main Actions */}
                    <div className="flex flex-col gap-4">
                      <a
                        href={data.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 py-6 rounded-3xl bg-primary text-primary-on font-black text-xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0"
                      >
                        DOWNLOAD NOW
                        <span className="text-2xl">↓</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Secondary Actions (Formats) */}
                <div className="p-10 md:p-12 bg-surface/20 border-t border-white/5 space-y-10">
                  {/* Video Formats */}
                  {data.formats.video && data.formats.video.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-surface-onVariant/10" />
                        <h4 className="text-sm font-black text-surface-onVariant/50 uppercase tracking-[0.3em]">Video Resolutions</h4>
                        <div className="h-px flex-1 bg-surface-onVariant/10" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {data.formats.video.slice(0, 8).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            className="px-5 py-4 rounded-2xl bg-surface/40 border border-surface-variant/50 text-surface-on text-center transition-all hover:bg-primary hover:text-primary-on hover:border-transparent group"
                          >
                            <div className="text-xs font-black opacity-40 group-hover:opacity-60 mb-1">{f.ext.toUpperCase()}</div>
                            <div className="font-black text-lg">{f.resolution}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio Formats */}
                  {data.formats.audio && data.formats.audio.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-surface-onVariant/10" />
                        <h4 className="text-sm font-black text-surface-onVariant/50 uppercase tracking-[0.3em]">Audio Only</h4>
                        <div className="h-px flex-1 bg-surface-onVariant/10" />
                      </div>
                      <div className="flex flex-wrap justify-center gap-3">
                        {data.formats.audio.slice(0, 4).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            className="px-8 py-4 rounded-2xl bg-secondary-container text-secondary-onContainer font-black flex items-center gap-3 hover:scale-105 transition-transform"
                          >
                            <span>♫</span>
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
      <footer className="py-20 text-center space-y-4">
        <div className="text-surface-onVariant/20 text-sm font-black tracking-[0.5em] uppercase">
          Toolz Downloadz Engine
        </div>
        <p className="text-xs text-surface-onVariant/40 font-bold max-w-md mx-auto px-6">
          A high-performance media bridge built for the modern web.
          Respect creators, download responsibly.
        </p>
      </footer>
    </div>
  )
}

