#!/usr/bin/env python3
"""
Lucy Neural — Phase 14 of the Lucy stack.

FastAPI server on anvil that produces 5 cortical region scores per second
for SoundChain's Neural visualizer (AgentStatusTicker.tsx).

Three operational modes — same /state API shape, swappable backend:
  - SYNTHETIC (v0, default) — oscillator-driven scores, no input needed.
    Lets us prove the anvil → SC streaming pipeline end-to-end while
    EEG hardware is on order and audio-stream upload isn't wired yet.
  - AUDIO_ML (v1, banked) — receives audio chunks via /audio POST,
    runs YAMNet on M5000, projects 521-class embedding → 5 regions.
  - EEG (v2, banked, when EEG hardware arrives) — receives EEG samples
    via /eeg POST, runs focus/SWS/HRV classifier.

Response shape (stable across all modes — visualizer doesn't care which
backend produced it):
  GET /state →
    {
      "regions": {
        "auditory":   0.42,
        "motor":      0.18,
        "prefrontal": 0.67,
        "emotional":  0.55,
        "reward":     0.31
      },
      "engagement": 43,        // 0-100, average × 100
      "source": "synthetic",   // "synthetic" | "audio-ml" | "eeg"
      "model": "oscillator-v0",
      "timestamp": 1715800000000
    }

Runs as systemd unit (lucy-neural.service) on port 11437.
Reverse-SSH tunnel forwards anvil:11437 → EC2:11437.
EC2 nginx exposes as norman.soundchain.io/neural/*.
Vercel /api/neural/state proxies to it.

When you're ready to upgrade SYNTHETIC → AUDIO_ML, replace
synthetic_step() with a YAMNet inference call. Or keep synthetic for
testing while AUDIO_ML runs alongside on a different mode flag.
"""
import math
import os
import time
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel


MODE = os.environ.get("LUCY_NEURAL_MODE", "synthetic")  # synthetic | audio-ml | eeg
MODEL_NAME = os.environ.get("LUCY_NEURAL_MODEL", "oscillator-v0")


class RegionScores(BaseModel):
    auditory: float
    motor: float
    prefrontal: float
    emotional: float
    reward: float


class StateResponse(BaseModel):
    regions: RegionScores
    engagement: int
    source: str
    model: str
    timestamp: int


app = FastAPI(title="Lucy Neural", version="0.1.0")

# Track when the server started so synthetic oscillators have a stable
# phase reference. Each region uses a slightly different frequency so
# their "activity" looks plausibly de-correlated, like real brain regions.
_start_time = time.time()


def synthetic_step(t_seconds: float) -> RegionScores:
    """Oscillator-driven cortical scores. Each region has its own period
    and phase offset so the visualizer animates believably without any
    real input. Values clamped to [0, 1]."""
    # Frequencies tuned so each region peaks/dips on its own rhythm
    auditory = 0.45 + 0.35 * math.sin(t_seconds * 0.7)
    motor = 0.30 + 0.25 * math.sin(t_seconds * 0.4 + 1.3)
    prefrontal = 0.55 + 0.30 * math.sin(t_seconds * 1.1 + 0.5)
    emotional = 0.50 + 0.30 * math.sin(t_seconds * 0.9 + 2.2)
    reward = 0.40 + 0.30 * math.sin(t_seconds * 0.6 + 3.1)
    # Clamp + add minor jitter so the visualizer never looks robotic
    def clamp(x: float) -> float:
        return max(0.0, min(1.0, x))
    return RegionScores(
        auditory=clamp(auditory),
        motor=clamp(motor),
        prefrontal=clamp(prefrontal),
        emotional=clamp(emotional),
        reward=clamp(reward),
    )


@app.get("/")
def health():
    return {
        "status": "lucy-neural",
        "mode": MODE,
        "model": MODEL_NAME,
        "version": "0.1.0",
        "uptime_s": round(time.time() - _start_time, 1),
    }


@app.get("/state", response_model=StateResponse)
def get_state():
    """Returns the latest cortical region scores. In SYNTHETIC mode this
    is computed on demand from the oscillator. In AUDIO_ML and EEG
    modes (banked), this returns the most recent classifier output."""
    if MODE == "synthetic":
        regions = synthetic_step(time.time() - _start_time)
    else:
        # Future modes — for now fall back to synthetic so the API never
        # 500s before AUDIO_ML or EEG modes are wired in.
        regions = synthetic_step(time.time() - _start_time)

    avg = (
        regions.auditory + regions.motor + regions.prefrontal
        + regions.emotional + regions.reward
    ) / 5.0
    engagement = int(round(avg * 100))

    return StateResponse(
        regions=regions,
        engagement=engagement,
        source=MODE,
        model=MODEL_NAME,
        timestamp=int(time.time() * 1000),
    )


# ─── Future endpoints (banked, return 501 until implemented) ─────────────
class AudioChunk(BaseModel):
    sample_rate: int
    samples: list[float]


@app.post("/audio")
def push_audio(chunk: AudioChunk):
    """Accept raw audio for AUDIO_ML mode. v1 plumbing — server-side
    YAMNet inference + region projection lands here."""
    if MODE != "audio-ml":
        return {"error": f"server not in audio-ml mode (currently {MODE})"}, 501
    return {"error": "audio-ml backend not yet implemented"}, 501


class EEGChunk(BaseModel):
    sample_rate: int
    channels: list[list[float]]
    timestamp_ms: Optional[int] = None


@app.post("/eeg")
def push_eeg(chunk: EEGChunk):
    """Accept EEG samples for EEG mode. v2 plumbing — server-side
    biosignal classifier lands here when EEG hardware is on Frank's head."""
    if MODE != "eeg":
        return {"error": f"server not in eeg mode (currently {MODE})"}, 501
    return {"error": "eeg backend not yet implemented"}, 501
