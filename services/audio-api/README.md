# Musaix Audio API

Python FastAPI service for real audio-analysis work.

This service exists because browser-side simulated metrics are not enough for Musaix Pro. The frontend should upload and display; this backend should measure.

## Planned Stack

- FastAPI
- Uvicorn
- Librosa
- NumPy
- SciPy
- SoundFile
- PyDub
- Pydantic

## Local Dev

```bash
cd services/audio-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

On Windows PowerShell:

```powershell
cd services/audio-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

## API

### `GET /health`

Returns service health.

### `POST /analyze`

Accepts an audio file and returns extracted metrics.

Planned response:

```json
{
  "filename": "track.wav",
  "sample_rate": 44100,
  "duration_seconds": 183.2,
  "metrics": {
    "rms_mean": 0.12,
    "zero_crossing_rate_mean": 0.04,
    "spectral_centroid_mean": 2210.4,
    "spectral_rolloff_mean": 8240.1,
    "tempo_bpm": 94.0
  }
}
```

## Deployment Target

Use Google Cloud Run, Fly.io, or Render. Do not force heavy audio processing into Vercel serverless functions.

## Error tracking

Sentry is optional. If `SENTRY_DSN` is unset, the SDK is not initialized.

```env
SENTRY_DSN=
SENTRY_RELEASE=
SENTRY_ENVIRONMENT=
GIT_SHA=
```

Release is `SENTRY_RELEASE`, then `GIT_SHA`, then Cloud Run's `K_REVISION`. Environment is `SENTRY_ENVIRONMENT` or `ENVIRONMENT`, and falls back to `production` when `K_SERVICE` is set. PII is not sent. Set these on the Cloud Run (or Fly.io / Render) service, not on the Vercel web project, unless you intentionally share a DSN.
