import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

const PRIMARY_TITLE = `Talk to multiple AI at once – ${SITE_NAME}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PRIMARY_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: PRIMARY_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: PRIMARY_TITLE,
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          {children}
          <footer className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-4">
            <p className="text-xs text-gray-500/90 dark:text-gray-400/90">
              Drav™ Copyright 2026 @abedelez{' '}
              <a
                href="https://github.com/AbedElez/Drav"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto underline hover:text-gray-700 dark:hover:text-gray-200"
              >
                GitHub
              </a>
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
