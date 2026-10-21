import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SearchProvider } from '@/components/search/SearchProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const display = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: "MA3NA — Mapping Morocco's economic connections",
    template: '%s · MA3NA',
  },
  description:
    'MA3NA maps the connections between Moroccan listed issuers, AMMC sectors, official index levels and dated Bourse and AMMC records, using only published data.',
  applicationName: 'MA3NA',
  keywords: ['Morocco', 'Casablanca Stock Exchange', 'AMMC', 'network analysis', 'economic graph'],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#06070a' },
    { media: '(prefers-color-scheme: light)', color: '#f6f4f0' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `(function(){try{var s=localStorage.getItem('ma3na-theme');var m=window.matchMedia('(prefers-color-scheme: light)').matches;var t=s==='light'||s==='dark'?s:(m?'light':'dark');document.documentElement.classList.toggle('light',t==='light');document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg antialiased">
        <ThemeProvider>
          <SearchProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-elevated focus:px-4 focus:py-2 focus:text-sm"
            >
              Skip to content
            </a>
            <div className="relative flex min-h-dvh flex-col">
              <SiteHeader />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
          </SearchProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}