import type { ProviderAlternative, ProviderReport, SynthesisBlockCode } from './types';

const ALTERNATIVES: ProviderAlternative[] = [
  {
    id: 'vercel_ai_gateway',
    repoEvidence:
      'src/app/api/generate-prompt/route.ts calls https://ai-gateway.vercel.sh/v1/chat/completions when AI_GATEWAY_API_KEY is set. README.md and .env.example name that key and MUSAIX_MODEL.',
    selectable: false,
    billing: 'would_bill_if_called',
    decision: 'Refused for artist research. This feature does not call Vercel AI Gateway and does not spend Vercel credits.',
  },
  {
    id: 'openai',
    repoEvidence: 'OPENAI_API_KEY is named in README.md and .env.example. No application source reads that variable or calls the OpenAI API.',
    selectable: false,
    billing: 'would_bill_if_called',
    decision: 'Not integrated. A documented variable name is not authorization to bill OpenAI, and there is no fallback from another provider.',
  },
  {
    id: 'google_generative_ai',
    repoEvidence:
      'GOOGLE_GENERATIVE_AI_API_KEY is named in README.md and .env.example. No application source reads it. services/geminiService.ts is legacy code outside the Next app: it expects API_KEY and @google/genai, which is not installed.',
    selectable: false,
    billing: 'would_bill_if_called',
    decision: 'Not integrated. Artist research does not call Gemini.',
  },
  {
    id: 'ai_sdk',
    repoEvidence: 'package.json depends on ai. No file under src/ imports it.',
    selectable: false,
    billing: 'not_a_model_provider',
    decision: 'The installed SDK is not a configured model account. Artist research does not route through it.',
  },
];

export function synthesisBlock(env: Record<string, string | undefined>): { code: SynthesisBlockCode; summary: string } {
  const selected = (env.ARTIST_RESEARCH_SYNTHESIS_PROVIDER ?? '').trim().toLowerCase();
  if (!selected) {
    return {
      code: 'unset',
      summary: 'Craft synthesis is off. No model provider is selected, and no model call is made.',
    };
  }
  if (selected === 'vercel' || selected === 'gateway' || selected === 'ai-gateway' || selected === 'vercel-ai-gateway') {
    return {
      code: 'vercel_gateway_refused',
      summary: 'ARTIST_RESEARCH_SYNTHESIS_PROVIDER points at Vercel AI Gateway. Artist research refuses that provider and does not call it.',
    };
  }
  if (selected === 'openai' || selected === 'google' || selected === 'gemini' || selected === 'google-generative-ai') {
    return {
      code: 'direct_provider_not_integrated',
      summary: `ARTIST_RESEARCH_SYNTHESIS_PROVIDER=${selected} is not an integrated provider. The request stops before any model call. A key in the environment would not be used.`,
    };
  }
  if (selected === 'fixture') {
    return {
      code: 'fixture_refused',
      summary: 'Fixture synthesis is for automated tests only. The app does not serve fixture reports.',
    };
  }
  return {
    code: 'unknown_provider',
    summary: 'ARTIST_RESEARCH_SYNTHESIS_PROVIDER names an unknown provider. Artist research leaves synthesis off instead of guessing.',
  };
}

export function getResearchProviderReport(env: Record<string, string | undefined> = process.env): ProviderReport {
  const block = synthesisBlock(env);
  return {
    catalog: {
      providers: ['musicbrainz', 'english-wikipedia', 'wikidata'],
      billing: 'no_model_call',
      configured: true,
      note: 'Name and link lookup reads public MusicBrainz, English Wikipedia, and Wikidata records. Those requests do not use a model account. They are not a lyric-craft report.',
    },
    synthesis: {
      enabled: false,
      selectedProvider: null,
      acceptsVercelGateway: false,
      automaticFallback: false,
      code: block.code,
      summary: block.summary,
      alternatives: ALTERNATIVES,
    },
    privateArchives: {
      googleDrive: false,
      supabaseWrites: false,
      note: 'Public catalog research only. This feature does not read a private archive and does not write to Supabase.',
    },
  };
}
