import type { Metadata } from 'next';
import { ResearchWorkspace } from '@/components/artist-research/research-workspace';
import { getResearchProviderReport } from '@/lib/artist-research/providers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Artist research · Musaix Pro',
  description: 'Look up a public artist record and keep craft analysis blocked until real sources and an authorized non-Vercel model provider exist.',
};

export default function ResearchPage() {
  return <ResearchWorkspace providerReport={getResearchProviderReport()} />;
}
