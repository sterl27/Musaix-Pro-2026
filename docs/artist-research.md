# Artist research

`/research` looks up a public artist by name or by a MusicBrainz, English Wikipedia, or Wikidata link. Ambiguous names are returned as choices. A near match is not silently substituted: searching for Young Solo does not select Young Dolph.

## What runs without a model account

The lookup calls only:

- `https://musicbrainz.org/ws/2/artist/`
- `https://en.wikipedia.org/w/api.php` and `https://en.wikipedia.org/api/rest_v1/page/summary/`
- `https://www.wikidata.org/w/api.php` when the link is a Wikidata item

Those are public catalog requests. They do not bill a model provider. Redirects are not followed, lyric-host links are rejected, and response bodies are size-capped. The page shows the catalog identity and the short text those services returned. That text is labeled as source material, not as a craft conclusion.

Catalog biographies are not treated as evidence of rhyme, punchlines, hooks, or delivery. The page still opens a working brief: the fetched catalog text, search links that are not read, notes you type, and counts of a short passage you supply. Those counts describe the paste. They are not rhyme quality, timing, or a recording measurement. Download writes a Markdown file in the browser. Nothing is saved to Supabase.

Generated artist analysis remains unavailable. The page does not display a model report, including a fixture report.

## Why craft synthesis is off

This repository's only implemented model call is Vercel AI Gateway in `src/app/api/generate-prompt/route.ts`, using `AI_GATEWAY_API_KEY`. Artist research does not call that route or that host.

`OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` are names in `.env.example` and `README.md`. No application code reads them. `services/geminiService.ts` is legacy code outside the Next app and expects `API_KEY` plus `@google/genai`, which is not installed. The `ai` package is installed and unused under `src/`.

None of those facts is authorization to spend. There is no cross-provider fallback. `ARTIST_RESEARCH_SYNTHESIS_PROVIDER` may be left unset. If it is set to `openai`, `google`, `gemini`, `vercel`, `gateway`, or `fixture`, the lookup still makes no model call and the page explains why.

The HTTP handler forces `allowSynthesis` and `permitLiveSynthesis` off. A client field such as `acceptProviderBilling` is ignored. Validated report rendering exists for tests, which inject a fixture provider and label the report `fixture`. The app does not serve that fixture.

## Limits

Quotations that pass validation must be exact fragments of a cited source, at most 90 characters, and shorter than the stored excerpt. Schematics must be original text. Reports that add BPM, scores, radar charts, measured audio, or imitation instructions are discarded. No audio is analyzed.

The route allows 8 requests per minute per client key and 2 concurrent catalog lookups. MusicBrainz calls are spaced by at least 1.1 seconds. This feature does not read private archives and does not write to Supabase.
