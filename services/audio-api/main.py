from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import librosa
import numpy as np
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Musaix Audio API", version="0.1.0")


class AnalysisResponse(BaseModel):
    filename: str
    sample_rate: int
    duration_seconds: float
    metrics: dict[str, Any]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "musaix-audio-api"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)) -> AnalysisResponse:
    suffix = Path(file.filename or "audio.wav").suffix or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = Path(tmp.name)

    try:
        y, sr = librosa.load(tmp_path, sr=None, mono=True)
        duration = float(librosa.get_duration(y=y, sr=sr))

        rms = librosa.feature.rms(y=y)[0]
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

        metrics: dict[str, Any] = {
            "rms_mean": float(np.mean(rms)),
            "rms_max": float(np.max(rms)),
            "zero_crossing_rate_mean": float(np.mean(zcr)),
            "spectral_centroid_mean": float(np.mean(centroid)),
            "spectral_rolloff_mean": float(np.mean(rolloff)),
            "tempo_bpm": float(np.asarray(tempo).item() if np.asarray(tempo).size == 1 else tempo),
            "chroma_mean": [float(v) for v in np.mean(chroma, axis=1)],
        }

        return AnalysisResponse(
            filename=file.filename or "uploaded-audio",
            sample_rate=int(sr),
            duration_seconds=duration,
            metrics=metrics,
        )
    finally:
        tmp_path.unlink(missing_ok=True)
