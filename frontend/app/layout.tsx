import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI Job Evaluator',
  description: 'Evaluate job descriptions against your remembered preferences.',
}

// Explicit props rather than the global `LayoutProps<'/'>` helper: that type is emitted
// by `next dev` / `next build` / `next typegen`, so on a fresh clone `tsc --noEmit`
// fails before typegen has ever run. Same reasoning as the route handlers' explicit
// `{ params: Promise<…> }` signature.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
