# Musaix Pro 2026

Musaix Pro is a production-focused AI audio analysis dashboard.

The product direction is now:

```txt
Next.js dashboard
+ Supabase auth/database/storage
+ Python FastAPI audio-analysis service
+ Librosa feature extraction
+ Gemini/OpenAI interpretation layer
+ Vercel deploy
+ Cloud Run audio worker
```

## Current Product Path

Musaix Canvas v0.1 remains locked to a small production path:

```txt
Reference -> Prompt -> Project -> Export
```

The audio-analysis layer extends that foundation into real track intelligence:

```txt
Upload audio -> Extract metrics -> Store JSON -> Generate AI summary -> Export report
```

No agent swarm yet. No Pinecone, Chroma, Spotify OAuth, Ableton bridge, Google Drive sync, or multi-agent orchestration until the core analysis loop ships.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Vercel AI Gateway
- Python FastAPI
- Librosa / NumPy / SciPy

## Routes

- `/` — launch page
- `/canvas` — Musaix Canvas
- `/api/generate-prompt` — structured prompt generation route

## Services

- `services/audio-api` — Python FastAPI service for real audio feature extraction

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://xexzplnyzblflucfvbwt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_GATEWAY_API_KEY=
MUSAIX_MODEL=openai/gpt-5.5
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
MUSAIX_AUDIO_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase

Apply the base schema first:

```txt
supabase/schema.sql
```

Then apply the audio-analysis extension:

```txt
supabase/audio-analysis-schema.sql
```

Active Supabase project:

```txt
xexzplnyzblflucfvbwt
```

Core tables:

- `projects`
- `references`
- `prompts`
- `exports`
- `tracks`
- `analysis_jobs`
- `analysis_results`

## Local Dev

Install web dependencies:

```bash
npm install
npm run dev
```

Run the audio API:

```bash
cd services/audio-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

Windows PowerShell:

```powershell
cd services/audio-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

## Build Order

1. Keep `/canvas` stable.
2. Add Supabase Storage audio bucket.
3. Add upload + persistent player.
4. Call `services/audio-api /analyze`.
5. Store metrics in `analysis_results`.
6. Render waveform, spectral, chroma, and metric cards.
7. Generate Gemini/OpenAI summary from verified metrics.
8. Export JSON/PDF reports.

## Persistent audio workspace

Open `/audio` (also available from the home page and player dock). Drop one WAV/MP3, up to 100 MiB, for local playback. The single global player keeps its queue, time, volume and playback across client-side navigation to Studio and Canvas. Local files are not uploaded until **Save to library** is selected.

Configure the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then sign in with an existing email/password account to save tracks. The repository uses the existing private `musaix-audio` bucket and `musaix_tracks`; it does not create a second catalog or use service-role credentials. Signed playback links last 15 minutes and are renewed on expiry after rechecking ownership. Signing out/account changes clear private playback and queued private tracks.

Use Node.js 22+ and `npm ci`. Verify with `npm run test:run`, `npm run typecheck`, `npm run lint`, and `npm run build`. For real media/navigation tests: `npx playwright install chromium`, `npm run build`, then `npm run test:e2e`. Tests generate an in-memory WAV; no private music is committed.

The Next application lives in `src/`; legacy standalone demo files at the root are preserved but excluded from its typecheck. Metering, MIR reports, stems and agent interpretation remain later milestones. See `docs/audio-runtime-verification.md` for measured checks and limits.
