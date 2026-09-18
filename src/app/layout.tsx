import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Sans, Fraunces } from 'next/font/google';

import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });

// Static rendering has no per-request nonce to embed on Next's inline hydration scripts, so the
// CSP nonce set in middleware.ts would never match. Force dynamic rendering so every response
// gets its own matching nonce.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'What Gift Should I Choose?',
  description: 'A simple starting point for choosing a thoughtful gift.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}