from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import librosa
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from pydantic import BaseModel

app = FastAPI(title="Musaix Audio API", version="0.1.0")

UPLOAD_CHUNK_BYTES = 1024 * 1024
MAX_UPLOAD_BYTES = 250 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/webm",
    "audio/x-flac",
    "audio/x-m4a",
    "audio/x-wav",
}


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
    if file.content_type and file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported audio media type",
        )

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    tmp_path: Path | None = None

    try:
        uploaded_bytes = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                uploaded_bytes += len(chunk)
                if uploaded_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Audio upload exceeds the 250 MB limit",
                    )
                tmp.write(chunk)

        if uploaded_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio upload is empty",
            )

        try:
            y, sr = librosa.load(tmp_path, sr=None, mono=True)
        except (EOFError, OSError, RuntimeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file could not be decoded",
            ) from exc

        if y.size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file contains no decodable samples",
            )

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
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
