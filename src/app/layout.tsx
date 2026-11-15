import type { Metadata } from 'next';
import { Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import '@/components/audio/audio.css';
import { AudioProvider } from '@/components/audio/audio-provider';
import { AppFrame } from '@/components/gateway/app-frame';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif', display: 'swap' });

const description = 'Artist-first music production. You write the creative brief. AI stays an instrument, never the hand.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sterlai.com'),
  title: { default: 'Musaix Pro', template: '%s · Musaix Pro' },
  description,
  openGraph: {
    title: 'Musaix Pro',
    description,
    siteName: 'Musaix Pro',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Musaix Pro',
    description
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${serif.variable}`}>
      <body>
        <AudioProvider>
          <AppFrame>{children}</AppFrame>
        </AudioProvider>
      </body>
    </html>
  );
}
