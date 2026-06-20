# Musaix Pro 2026

Musaix Canvas v0.1 is locked to a small production path:

```txt
Reference → Prompt → Project → Export
```

No agent swarm yet. No Pinecone, Chroma, Spotify OAuth, Ableton bridge, Google Drive sync, or multi-agent orchestration.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Supabase
- Vercel AI Gateway

## Routes

- `/` — launch page
- `/canvas` — Musaix Canvas
- `/api/generate-prompt` — structured prompt generation route

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AI_GATEWAY_API_KEY=
```

## Supabase

Apply `supabase/schema.sql` to the active Supabase project:

```txt
xexzplnyzblflucfvbwt
```

Tables:

- `projects`
- `references`
- `prompts`
- `exports`

## Local Dev

```bash
npm install
npm run dev
```
