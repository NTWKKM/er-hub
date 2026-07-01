import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MNRH-ED Standing Order Hub',
  description: 'Emergency Department clinical standing order system for Maharat Nakhon Ratchasima Hospital.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}