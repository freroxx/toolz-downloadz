import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta'
})

export const metadata = {
  title: 'Toolz Downloadz — TikTok & Instagram Downloader',
  description: 'Paste a TikTok or Instagram link and get the video. Fast, free, no login. Built with Next.js + a FastAPI extraction engine.',
  metadataBase: new URL('https://toolz-downloadz.vercel.app'),
  openGraph: {
    title: 'Toolz Downloadz — TikTok & Instagram Downloader',
    description: 'Paste a link. Get the video. Thatʼs it.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plusJakarta.variable}`}>
      <body className="bg-surface text-surface-on antialiased font-sans">
        {children}
      </body>
    </html>
  )
}

