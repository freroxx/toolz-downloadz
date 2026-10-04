import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta'
})

export const metadata = {
  title: 'Toolz Downloadz — YouTube, TikTok & Instagram Downloader',
  description: 'Paste a YouTube, TikTok or Instagram link and get the video. Fast, free, no login. YouTube merges on your device; TikTok & Instagram via a FastAPI engine.',
  metadataBase: new URL('https://toolz-downloadz.vercel.app'),
  openGraph: {
    title: 'Toolz Downloadz — YouTube, TikTok & Instagram Downloader',
    description: 'Paste a link. Get the video. Thatʼs it.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* Pre-paint theme: auto (default) follows the OS, no light-flash. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('toolz-theme')||'auto';if(t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})` }} />
      </head>
      <body className="bg-surface text-surface-on antialiased font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  )
}

