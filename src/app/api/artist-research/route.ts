import { LiveArtistCatalog } from '@/lib/artist-research/catalog';
import { ResearchGate } from '@/lib/artist-research/gate';
import { handleArtistResearch } from '@/lib/artist-research/handler';
import { HostPacer } from '@/lib/artist-research/http';
import { getResearchProviderReport } from '@/lib/artist-research/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const catalog = new LiveArtistCatalog({ pacer: new HostPacer(1100) });
const gate = new ResearchGate({ maxConcurrent: 2, windowMs: 60_000, maxPerWindow: 8 });

export function GET() {
  return Response.json(getResearchProviderReport());
}

export function POST(request: Request) {
  return handleArtistResearch(request, { catalog, gate, providerReport: () => getResearchProviderReport() });
}
