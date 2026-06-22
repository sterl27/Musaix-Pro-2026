import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Musaix Pro',
  description: 'Musaix Pro studio cockpit, canvas workflow, and audio intelligence shell.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
