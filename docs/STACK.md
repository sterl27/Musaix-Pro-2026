# Musaix Pro Production Stack

Musaix Pro should ship as a real full-stack audio-analysis product, not a simulated dashboard.

## Core Architecture

```txt
Next.js frontend
+ Supabase auth/database/storage
+ Python FastAPI audio-analysis service
+ Librosa / NumPy / SciPy feature extraction
+ Gemini / OpenAI interpretation layer
+ Vercel app deploy
+ Cloud Run audio worker deploy
```

## Application Layer

| Layer | Choice | Purpose |
|---|---|---|
| Web app | Next.js App Router | Dashboard, routes, API boundaries, deployment |
| UI | React + TypeScript | Component system and type safety |
| Styling | Tailwind CSS + shadcn/ui | Fast studio-grade interface |
| Auth | Supabase Auth | User login and session ownership |
| Database | Supabase Postgres | Projects, tracks, analysis jobs, summaries |
| Storage | Supabase Storage | Audio files, reference images, exports |
| AI | Vercel AI SDK / Gateway | Provider routing, streaming, budget control |
| Analysis | Python FastAPI | Real MIR/audio feature extraction |
| Jobs | Inngest / Trigger.dev later | Long-running analysis orchestration |

## What Runs in the Browser

- Audio upload UI
- Microphone recording
- Playback
- Live waveform / analyser visuals
- Dashboard interactions
- AI chat interface
- Session navigation

## What Runs in Python

- Spectral centroid
- Spectral rolloff
- Zero-crossing rate
- RMS energy
- Tempo / beat estimate
- Chroma features
- MFCCs
- Mel spectrograms
- Loudness metrics
- Exportable JSON reports

## AI Responsibility

AI interprets verified metrics. It should not invent raw metrics.

Correct flow:

```txt
Audio file
  -> Python metrics
  -> Stored JSON
  -> AI technical interpretation
  -> User-facing summary / report
```

## MVP Build Order

1. Next.js dashboard shell
2. Supabase Auth
3. Supabase Storage upload bucket
4. Track upload + persistent player
5. Python `/analyze` endpoint
6. Librosa feature extraction
7. Save metrics to Supabase
8. Render waveform / spectral / chroma dashboard
9. Gemini summary from real metrics
10. AI Quick Chat over project context
11. Export JSON / PDF report
