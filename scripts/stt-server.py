#!/usr/bin/env python3
"""
faster-whisper STT server.
Receives raw audio via POST /transcribe, returns JSON { "text": "..." }.
"""

import os
import sys
import json
import io
import wave
import tempfile
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "tiny")

app = FastAPI()

_model = None


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        print(f"[stt] Loading faster-whisper model '{MODEL_SIZE}'...", flush=True)
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print("[stt] Model ready.", flush=True)
    return _model


@app.post("/transcribe")
async def transcribe(req: Request):
    body = await req.body()
    if not body:
        return JSONResponse({"text": ""})

    try:
        model = get_model()

        # Write audio to a temp file so faster-whisper can read it
        # (it supports .wav, .mp3, .webm, .ogg, etc.)
        suffix = _guess_ext(str(req.headers.get("content-type", "") or ""))

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(body)
            tmp = f.name

        try:
            segments, info = model.transcribe(tmp, beam_size=5, language="en")
            text = " ".join(seg.text for seg in segments).strip()
        finally:
            os.unlink(tmp)

        return JSONResponse({"text": text})

    except Exception as e:
        print(f"[stt] Audio frame note: {e}", flush=True)
        return JSONResponse({"text": ""})


def _guess_ext(content_type: str) -> str:
    ct = content_type.lower()
    if "webm" in ct:
        return ".webm"
    if "ogg" in ct:
        return ".ogg"
    if "wav" in ct or "wave" in ct:
        return ".wav"
    if "mp3" in ct:
        return ".mp3"
    if "mp4" in ct:
        return ".mp4"
    if "m4a" in ct:
        return ".m4a"
    return ".webm"


if __name__ == "__main__":
    import uvicorn
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
    print(f"[stt] Starting on 0.0.0.0:{port}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
