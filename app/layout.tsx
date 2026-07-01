import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';

const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: 'MNRH-ED Standing Order Hub',
  description: 'Emergency Department clinical standing order system for Maharat Nakhon Ratchasima Hospital.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={sarabun.variable}>
      <body className={sarabun.className}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}