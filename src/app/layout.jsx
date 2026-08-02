import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta'
})

export const metadata = {
  title: 'Toolz Downloadz | M3 Expressive Downloader',
  description: 'A modern, expressive media extraction web app built with Material 3 principles.',
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

