import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@graphology/ui/globals.css';
import './globals.css';
import { SiteShell } from '../components/layout/site-shell';
import { companySettings } from '../lib/config';
import { buildPageMetadata } from '../lib/seo';
import { themeConfig } from '../lib/theme';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = buildPageMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themeConfig.lightMode.themeColor },
    { media: '(prefers-color-scheme: dark)', color: themeConfig.darkMode.themeColor },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang={companySettings.languages[0] ?? 'en'} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
