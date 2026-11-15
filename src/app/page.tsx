import type { Metadata } from 'next';
import { LandingPage } from '@/components/gateway/landing';

export const metadata: Metadata = {
  description: 'Artist-first music production. You write the creative brief. AI stays an instrument, never the hand.',
  openGraph: {
    title: 'Musaix Pro',
    description: 'Artist-first music production. You write the creative brief. AI stays an instrument, never the hand.',
    url: 'https://sterlai.com'
  }
};

export default function HomePage() {
  return <LandingPage />;
}
