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
        throw new Error('Failed to extract media. Please check the URL and your API key.')
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

  return (
    <div className="min-h-screen bg-surface text-surface-on selection:bg-primary/30">
      {/* Docked Header Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-surface/80 backdrop-blur-md border-b border-surface-variant">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-on font-black">TD</div>
          <span className="font-bold tracking-tight">Toolz Downloadz</span>
        </div>
        <a
          href="https://github.com/toolz-downloadz/api"
          target="_blank"
          className="px-4 py-2 rounded-full bg-surface-variant text-surface-onVariant text-sm font-semibold hover:bg-surface-onVariant/10 transition-colors"
        >
          GitHub
        </a>
      </nav>

      <main className="pt-32 pb-20 px-4 max-w-4xl mx-auto flex flex-col items-center gap-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-primary leading-none">
            Toolz<br />Downloadz
          </h1>
          <p className="text-xl md:text-2xl text-surface-onVariant font-medium max-w-lg mx-auto">
            Experience media extraction with Material 3 Expressive elegance.
          </p>
        </motion.div>

        {/* Hero Search Input (Large Pill) */}
        <motion.form
          onSubmit={handleExtract}
          className="w-full relative group max-w-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your video URL here..."
              className="w-full pl-8 pr-40 py-7 rounded-full bg-surface-variant text-surface-onVariant border-2 border-transparent focus:border-primary/40 focus:bg-surface-variant focus:shadow-[0_0_0_10px_rgba(103,80,164,0.05)] outline-none text-xl transition-all shadow-xl placeholder:text-surface-onVariant/40"
            />
            <button
              disabled={status === 'loading'}
              className="absolute right-3 px-10 py-4 rounded-full bg-primary text-primary-on font-bold text-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all shadow-lg"
            >
              {status === 'loading' ? 'Extracting...' : 'Extract'}
            </button>
          </div>
        </motion.form>

        {/* Result Area */}
        <div className="w-full flex justify-center min-h-[400px]">
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col gap-4 max-w-2xl"
              >
                <div className="w-full aspect-video bg-surface-variant animate-pulse rounded-[2.5rem]" />
                <div className="h-8 w-3/4 bg-surface-variant animate-pulse rounded-full" />
                <div className="h-6 w-1/2 bg-surface-variant animate-pulse rounded-full" />
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl p-8 rounded-[2rem] bg-error-container text-error-onContainer border border-error/20 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-error flex items-center justify-center text-error-on text-2xl font-bold">!</div>
                <div>
                  <h4 className="font-bold text-xl">Something went wrong</h4>
                  <p className="opacity-80">{error}</p>
                </div>
              </motion.div>
            )}

            {status === 'success' && data && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-2xl bg-surface-variant rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-surface-onVariant/5"
              >
                {/* Thumbnail & Badges */}
                <div className="relative aspect-video">
                  <img
                    src={data.thumbnail}
                    alt={data.title}
                    className="w-full h-full object-cover"
                  />
                  {data.duration && (
                    <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-bold rounded-md">
                      {formatDuration(data.duration)}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 px-4 py-1 bg-primary text-primary-on text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                    {data.ext || 'MP4'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-10 flex flex-col gap-8">
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-surface-on">
                      {data.title}
                    </h3>
                    <p className="text-xl text-surface-onVariant font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {data.uploader}
                    </p>
                  </div>

                  {/* Split Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href={data.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-6 rounded-3xl bg-primary text-primary-on font-black text-lg hover:shadow-[0_20px_40px_-15px_rgba(103,80,164,0.4)] transition-all active:scale-[0.97]"
                    >
                      VIDEO MP4
                    </a>
                    <a
                      href={data.formats?.find(f => f.ext === 'mp3' || (f.acodec !== 'none' && f.vcodec === 'none'))?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (e.currentTarget.getAttribute('href') === '#') {
                          e.preventDefault();
                          alert('Audio-only version not found for this media.');
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-6 rounded-3xl bg-secondary-container text-secondary-onContainer font-black text-lg hover:shadow-xl transition-all active:scale-[0.97]"
                    >
                      AUDIO MP3
                    </a>
                  </div>


                  {/* Additional Formats Toggle */}
                  {data.formats && data.formats.length > 0 && (
                    <div className="pt-4 border-t border-surface-onVariant/10">
                      <p className="text-sm font-bold text-surface-onVariant/60 uppercase tracking-widest mb-4">All Available Qualities</p>
                      <div className="flex flex-wrap gap-2">
                        {data.formats.slice(0, 6).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            className="px-4 py-2 rounded-xl bg-surface/50 text-surface-on text-xs font-bold hover:bg-primary hover:text-primary-on transition-colors"
                          >
                            {f.format_note || f.height || 'HD'} {f.ext.toUpperCase()}
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
      <footer className="py-10 text-center text-surface-onVariant/30 text-sm font-bold tracking-widest uppercase">
        Built with Material 3 Expressive
      </footer>
    </div>
  )
}

