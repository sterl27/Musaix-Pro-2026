import io
import sys
import wave
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app  # noqa: E402

client = TestClient(app)


def _sine_wav(seconds: float = 1.0, sr: int = 22050) -> bytes:
    t = np.linspace(0, seconds, int(sr * seconds), endpoint=False)
    samples = (0.4 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(samples.tobytes())
    return buf.getvalue()


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200


def test_analyze_valid_wav() -> None:
    response = client.post(
        "/analyze", files={"file": ("tone.wav", _sine_wav(), "audio/wav")}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "tone.wav"
    assert body["duration_seconds"] > 0.9


def test_analyze_rejects_non_audio_media_type() -> None:
    response = client.post(
        "/analyze", files={"file": ("notes.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 415


def test_analyze_rejects_undecodable_audio() -> None:
    response = client.post(
        "/analyze", files={"file": ("fake.wav", b"not really audio" * 64, "audio/wav")}
    )
    assert response.status_code == 400


def test_analyze_rejects_empty_upload() -> None:
    response = client.post("/analyze", files={"file": ("empty.wav", b"", "audio/wav")})
    assert response.status_code == 400
