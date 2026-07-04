---
title: Librosa Audio Analysis Skill v2
status: active
stack: Musaix Pro / Alic3X / Eve / Hermes / Vercel
---

# Librosa Audio Analysis Skill v2

This document captures the Musaix Pro audio-analysis skill for production integration with the Vercel app, Eve agent layer, Alic3X command layer, Hermes router, Supabase storage, and an external Python MIR worker.

## Purpose

Use this skill for librosa-based audio analysis, feature extraction, beat detection, vocal pitch analysis, spectrogram generation, and Musaix cognition export.

Primary use cases:

- MFCC, chroma, spectral, mel-spectrogram feature extraction
- Beat, onset, tempo, and tempogram analysis
- Vocal pitch analysis using `librosa.pyin`
- Harmonic/percussive separation
- Visual reports: waveform, mel spectrogram, chroma, tempogram
- Structured JSON export for Musaix 6-layer cognition
- Batch stem/mix/reference-track comparison
- Ableton quantization markers and OSC/MIDI bridge prep
- Agent memory ingestion through Supabase, ChromaDB, or vector stores

## Production Architecture

```txt
Vercel / Next.js App
├── /audio
│   ├── upload track
│   ├── display waveform
│   ├── show analysis status
│   └── render generated reports
│
├── /api/audio/upload
│   └── uploads audio to Vercel Blob or Supabase Storage
│
├── /api/audio/analyze
│   └── sends job to external Python worker
│
├── /api/agent
│   └── Eve / Alic3X / Musaix agent via Vercel AI Gateway
│
External Python Worker
├── FastAPI
├── librosa
├── soundfile
├── numpy
├── scipy
├── matplotlib
├── joblib
└── exports JSON + PNG + stems
```

## Environment

### Vercel App

```bash
pnpm add ai @ai-sdk/gateway @vercel/blob zod @supabase/supabase-js
```

```bash
AI_GATEWAY_API_KEY=
BLOB_READ_WRITE_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUDIO_WORKER_URL=
AUDIO_WORKER_SECRET=
```

### Python Worker

```txt
fastapi
uvicorn
librosa
soundfile
numpy
scipy
matplotlib
joblib
requests
pydantic
python-multipart
```

## Feature Extraction Contract

The worker should return this shape:

```json
{
  "track_id": "string",
  "metadata": {
    "filename": "string",
    "duration_sec": 0,
    "sample_rate": 22050,
    "tempo_bpm": 0,
    "num_beats": 0,
    "num_onsets": 0,
    "mean_rms": 0,
    "mean_centroid": 0
  },
  "rhythm": {
    "tempo": 0,
    "beat_times": [],
    "onset_times": [],
    "tempogram_mean": []
  },
  "timbre": {
    "mfcc_mean": [],
    "mfcc_std": [],
    "chroma_mean": [],
    "spectral_centroid_mean": 0,
    "spectral_contrast_mean": []
  },
  "pitch_harmonic": {
    "f0_mean_voiced": null,
    "voiced_ratio": 0,
    "harmonic_energy_ratio": 0
  },
  "artifacts": {
    "features_json_url": "string",
    "analysis_report_png_url": "string",
    "harmonic_wav_url": "string",
    "percussive_wav_url": "string"
  }
}
```

## Musaix 6-Layer Cognition Mapping

```ts
export type MusaixCognitionInput = {
  sonic_perceptual: {
    mfcc_mean: number[];
    mfcc_std: number[];
    spectral_centroid: number;
    spectral_contrast: number[];
  };
  emotional_arc: {
    tempo: number;
    energy_envelope: number;
    brightness: number;
    harmonic_tension: number;
  };
  lyric_intelligence: {
    voiced_ratio: number;
    f0_mean: number | null;
    vocal_segments: number[];
  };
  rhythm_structure: {
    tempo: number;
    beat_times: number[];
    onset_times: number[];
    tempogram_mean: number[];
  };
  structural: Record<string, unknown>;
  relationship_mapping: Record<string, unknown>;
};
```

## Vercel Upload Route

```ts
// app/api/audio/upload/route.ts
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file") as File;

  const blob = await put(`audio/${file.name}`, file, {
    access: "private",
    addRandomSuffix: true,
  });

  return Response.json(blob);
}
```

## Vercel Analysis Route

```ts
// app/api/audio/analyze/route.ts
import { z } from "zod";

const AnalyzeRequest = z.object({
  trackId: z.string(),
  fileUrl: z.string().url(),
});

export async function POST(req: Request) {
  const body = AnalyzeRequest.parse(await req.json());

  const response = await fetch(`${process.env.AUDIO_WORKER_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AUDIO_WORKER_SECRET}`,
    },
    body: JSON.stringify({
      track_id: body.trackId,
      file_url: body.fileUrl,
      output_mode: "musaix_cognition",
    }),
  });

  if (!response.ok) {
    return Response.json({ error: "Audio analysis failed" }, { status: 500 });
  }

  return Response.json(await response.json());
}
```

## Eve Agent Route

```ts
// app/api/agent/route.ts
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export async function POST(req: Request) {
  const { messages, analysis } = await req.json() as {
    messages: UIMessage[];
    analysis?: unknown;
  };

  const result = streamText({
    model: "openai/gpt-5.5",
    system: `
You are Eve, the Musaix Audio Intelligence build and analysis agent.
Use uploaded librosa-derived features to explain rhythm, timbre, harmony,
vocal behavior, arrangement decisions, Ableton actions, and prompt refinement.
Do not invent audio facts not present in the analysis payload.
`,
    messages: await convertToModelMessages(messages),
    providerOptions: {
      gateway: {
        order: ["openai", "anthropic", "google"],
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

## Python Worker Skeleton

```py
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import os

app = FastAPI(title="Musaix Audio Worker")

class AnalyzeJob(BaseModel):
    track_id: str
    file_url: str
    output_mode: str = "musaix_cognition"

@app.post("/analyze")
async def analyze(job: AnalyzeJob, authorization: str | None = Header(default=None)):
    expected = f"Bearer {os.environ['AUDIO_WORKER_SECRET']}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # TODO:
    # 1. Download file_url
    # 2. Run librosa analysis
    # 3. Export features JSON
    # 4. Generate analysis PNG
    # 5. Upload/store artifacts
    # 6. Return Musaix cognition payload

    return {
        "track_id": job.track_id,
        "status": "queued_or_complete",
        "mode": job.output_mode,
    }
```

## Deploy Commands

```bash
pnpm install
pnpm build
vercel link
vercel env add AI_GATEWAY_API_KEY
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add AUDIO_WORKER_URL
vercel env add AUDIO_WORKER_SECRET
vercel deploy --prod
```

## Boundary Decision

Do not run the heavy librosa analysis engine directly inside normal Vercel app routes. Use Vercel for UI, upload, orchestration, Gateway, and deployment. Use a Python worker for MIR/audio processing.
