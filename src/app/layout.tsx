import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'

export const metadata: Metadata = {
  title: 'Drav - All intelligence, all at once',
  description: 'Compare answers from OpenAI, Anthropic, and Google Gemini',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
