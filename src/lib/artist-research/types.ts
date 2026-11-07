export const SOURCE_KINDS = [
  'catalog_record',
  'encyclopedia_summary',
  'interview',
  'review',
  'criticism',
  'artist_statement',
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const CRAFT_SOURCE_KINDS = ['interview', 'review', 'criticism', 'artist_statement'] as const;

export type CraftSourceKind = (typeof CRAFT_SOURCE_KINDS)[number];

export const SECTION_IDS = ['vocabulary', 'rhyme', 'punchlines', 'narrative', 'hooks', 'delivery'] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const EVIDENCE_LAYERS = ['source_quotation', 'critic_observation', 'model_interpretation', 'schematic'] as const;

export type EvidenceLayer = (typeof EVIDENCE_LAYERS)[number];

export type CatalogLink = { label: string; href: string };

export type NameMatch = 'exact' | 'phrase' | 'alias' | 'mention';

export type ArtistCandidate = {
  id: string;
  name: string;
  disambiguation: string;
  kind: string;
  area: string;
  blurb: string;
  urls: CatalogLink[];
  match?: NameMatch;
  aliases?: string[];
};

export type PublicIdentity = {
  id: string;
  name: string;
  disambiguation: string;
  kind: string;
  area: string;
  urls: CatalogLink[];
  aliases?: string[];
};

export type PublicSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievedAt: string;
  kind: SourceKind;
  excerpt: string;
};

export type ProviderAlternative = {
  id: string;
  repoEvidence: string;
  selectable: false;
  billing: 'would_bill_if_called' | 'not_a_model_provider';
  decision: string;
};

export type ProviderReport = {
  catalog: {
    providers: ['musicbrainz', 'english-wikipedia', 'wikidata'];
    billing: 'no_model_call';
    configured: true;
    note: string;
  };
  synthesis: {
    enabled: false;
    selectedProvider: null;
    acceptsVercelGateway: false;
    automaticFallback: false;
    code: SynthesisBlockCode;
    summary: string;
    alternatives: ProviderAlternative[];
  };
  privateArchives: {
    googleDrive: false;
    supabaseWrites: false;
    note: string;
  };
};

export type SynthesisBlockCode =
  | 'unset'
  | 'vercel_gateway_refused'
  | 'direct_provider_not_integrated'
  | 'fixture_refused'
  | 'unknown_provider';

export type SynthesisRequest = {
  instructions: string;
  responseContract: 'ArtistResearchReportV1';
  artist: { id: string; name: string };
  sourceData: Array<Pick<PublicSource, 'id' | 'publisher' | 'title' | 'url' | 'kind' | 'excerpt'>>;
};

export interface SynthesisProvider {
  id: string;
  label: 'fixture' | 'live';
  synthesize(input: SynthesisRequest, signal: AbortSignal): Promise<unknown>;
}

export type RhymeRole = 'end_rhyme' | 'internal_echo' | 'repetition' | 'other';

export type RhymeLine = {
  text: string;
  role: RhymeRole;
  original: boolean;
  soundFamily?: string;
  highlight?: string;
  citationIds?: string[];
};

export type RhymeGraphic = {
  type: 'rhyme_placement';
  basis: 'schematic' | 'printed_excerpt';
  caption: string;
  lines: RhymeLine[];
};

export type PunchGraphic = {
  type: 'setup_turn_payoff';
  basis: 'schematic';
  caption: string;
  original: true;
  steps: [
    { id: 'setup'; text: string },
    { id: 'turn'; text: string },
    { id: 'payoff'; text: string },
  ];
};

export type ComparisonRow = {
  aspect: string;
  left: string;
  right: string;
  evidence: 'documented' | 'disputed' | 'not_established';
};

export type ComparisonGraphic = {
  type: 'qualitative_comparison';
  caption: string;
  leftHeading: string;
  rightHeading: string;
  rows: ComparisonRow[];
};

export type ReportGraphic = RhymeGraphic | PunchGraphic | ComparisonGraphic;

export type ReportClaim = {
  layer: EvidenceLayer;
  text: string;
  citationIds: string[];
  quotation?: string;
};

export type ReportSection = {
  id: SectionId;
  claims: ReportClaim[];
};

export type ArtistReport = {
  version: 1;
  label: 'fixture' | 'live';
  audioMeasured: false;
  coverageNote: string;
  artist: PublicIdentity;
  sources: PublicSource[];
  sections: ReportSection[];
  graphics: ReportGraphic[];
  notEstablished: string[];
  takeaways: Array<{ text: string; imitatesArtist: false }>;
};

export type ResearchResult =
  | { ok: true; status: 'report'; report: ArtistReport }
  | {
      ok: false;
      status: 'disambiguation';
      query: string;
      candidates: ArtistCandidate[];
      truncated: boolean;
      message: string;
    }
  | { ok: false; status: 'unknown'; message: string }
  | { ok: false; status: 'ambiguous_page'; message: string }
  | { ok: false; status: 'invalid_input'; message: string }
  | {
      ok: false;
      status: 'insufficient_sources';
      message: string;
      identity: PublicIdentity;
      sources: PublicSource[];
      synthesis: ProviderReport;
    }
  | {
      ok: false;
      status: 'synthesis_unavailable';
      message: string;
      identity: PublicIdentity;
      sources: PublicSource[];
      synthesis: ProviderReport;
    }
  | {
      ok: false;
      status: 'billing_confirmation_required';
      message: string;
      identity: PublicIdentity;
      sources: PublicSource[];
      synthesis: ProviderReport;
    }
  | { ok: false; status: 'provider_unavailable'; provider: string; message: string }
  | { ok: false; status: 'report_rejected'; message: string; errors: string[] }
  | { ok: false; status: 'rate_limited'; message: string; retryAfterMs: number }
  | { ok: false; status: 'cancelled'; message: string };

export type CatalogSearch = { candidates: ArtistCandidate[]; truncated: boolean };

export type CatalogLookup =
  | { status: 'found'; identity: PublicIdentity; sources: PublicSource[] }
  | { status: 'missing' }
  | { status: 'ambiguous_page'; message: string }
  | { status: 'unavailable'; provider: string; message: string };

export interface ArtistCatalog {
  search(name: string, signal: AbortSignal): Promise<CatalogSearch>;
  lookup(id: string, signal: AbortSignal): Promise<CatalogLookup>;
}
