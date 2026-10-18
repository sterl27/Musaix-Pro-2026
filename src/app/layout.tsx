import type { Metadata } from 'next';
import './globals.css';
import '@/components/audio/audio.css';
import { AudioProvider } from '@/components/audio/audio-provider';
import { GlobalPlayer } from '@/components/audio/global-player';

export const metadata: Metadata = {
  title: 'Musaix Pro',
  description: 'Musaix Pro studio cockpit, canvas workflow, and audio intelligence shell.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body><AudioProvider><div className="audio-route-content">{children}</div><GlobalPlayer /></AudioProvider></body>
    </html>
  );
}
