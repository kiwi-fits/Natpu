import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F172A',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://natpu.fits-shop.workers.dev'),
  title: {
    default: 'Natpu – Spend together. Settle simply.',
    template: '%s | Natpu',
  },
  description: 'Private friend group expense tracker. Split costs, settle payments, and keep everyone on the same page.',
  keywords: ['expense splitting', 'group expenses', 'friend expenses', 'settle payments', 'natpu'],
  openGraph: {
    title: 'Natpu – Spend together. Settle simply.',
    description: 'Private friend group expense tracker. Split costs, settle payments, and keep everyone on the same page.',
    siteName: 'Natpu',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Natpu',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'Outfit, Inter, system-ui, sans-serif',
              borderRadius: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
