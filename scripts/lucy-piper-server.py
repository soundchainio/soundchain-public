#!/usr/bin/env python3
"""
Lucy Piper HTTP wrapper — exposes Piper TTS as a small JSON API.

Run via systemd (see lucy-piper.service). Listens on 127.0.0.1:11435 — the
norman-tunnel reverse-SSH service forwards this port to EC2's loopback, where
nginx proxies it as https://norman.soundchain.io/tts.

Single endpoint:
  POST /tts
  body: { "text": "..." }
  returns: WAV audio (audio/wav)

Why FastAPI: streaming WAV out of a Python subprocess via FastAPI's
StreamingResponse is ~10 lines and gives us the right transport semantics.
Could be ported to a tiny Rust/Go binary later for ~5ms of latency back, but
50-150ms is already fine for sentence-by-sentence playback.
"""
import os
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

PIPER_BIN = os.environ.get("PIPER_BIN", "/home/soundchain/piper-venv/bin/piper")
PIPER_MODEL = os.environ.get(
    "PIPER_MODEL",
    "/home/soundchain/piper-voices/en_US-lessac-medium.onnx",
)
MAX_TEXT_LEN = 2000  # one paragraph max per request — Lucy will chunk by sentence

app = FastAPI()


class TTSRequest(BaseModel):
    text: str


@app.get("/")
def health():
    return {
        "status": "lucy-piper",
        "model": os.path.basename(PIPER_MODEL),
    }


@app.post("/tts")
def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "text required")
    if len(text) > MAX_TEXT_LEN:
        text = text[:MAX_TEXT_LEN]

    # Write to a tempfile + return as FileResponse so FastAPI sets Content-Length
    # correctly. Saves the front-end from streaming-decode complexity for v1.
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out.close()
    try:
        proc = subprocess.run(
            [PIPER_BIN, "--model", PIPER_MODEL, "--output_file", out.name],
            input=text,
            text=True,
            timeout=30,
            capture_output=True,
        )
        if proc.returncode != 0:
            raise HTTPException(500, f"piper failed: {proc.stderr[:500]}")
        return FileResponse(
            out.name,
            media_type="audio/wav",
            headers={"Cache-Control": "no-store"},
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "piper timeout")
