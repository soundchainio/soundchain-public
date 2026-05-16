#!/usr/bin/env python3
"""
Lucy SDXL — Phase 16 of the Lucy stack.

FastAPI server on anvil that exposes Stable Diffusion XL for on-demand
artwork generation. Powers Gallery3D Path A (NFT cover art / empty
frame fills) and Land Atlas Path A (procedural parcel skyboxes /
ownership cards). Same backend, two consumers.

Runs on RTX 5000 (16GB VRAM, ~14GB free after Lucy chat). SDXL fits
in ~7-8GB. First inference cold load ~30-60s (weights into VRAM);
subsequent inferences ~10-15s per 1024×1024 image.

Endpoints:
  GET  /              → health (status, model, uptime)
  POST /generate      → { prompt, [width=1024], [height=1024], [steps=25],
                          [seed?], [negative_prompt?], [variant?] }
                       returns image/png bytes

Variants (preset prompts merged with user prompt):
  - "gallery-cover"  → square album-art style, vibrant, music-themed
  - "land-parcel"    → top-down terrain map style, geographic
  - "skybox"         → 360° landscape, atmospheric
  - default          → user prompt only

Mode flag: set LUCY_SDXL_MODEL via systemd Environment to swap to
Flux / SD3 / custom LoRA when ready.
"""
import io
import os
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel


MODEL_ID = os.environ.get(
    "LUCY_SDXL_MODEL",
    "stabilityai/stable-diffusion-xl-base-1.0",
)
DEVICE = os.environ.get("LUCY_SDXL_DEVICE", "cuda:1")  # RTX 5000 = device 1

# Lazy-load — pipeline initialized on first request to save startup time
# and let the server come up even if model weights aren't downloaded yet
_pipeline = None
_start_time = time.time()


def _load_pipeline():
    """Load SDXL pipeline lazily. First call downloads weights (~7GB)
    and shifts to GPU; subsequent calls reuse the loaded pipeline."""
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        import torch
        from diffusers import StableDiffusionXLPipeline
        _pipeline = StableDiffusionXLPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
        ).to(DEVICE)
        # Memory-saving config for tight VRAM budget alongside Lucy chat
        _pipeline.enable_attention_slicing()
        _pipeline.enable_vae_tiling()
        return _pipeline
    except Exception as e:
        raise HTTPException(503, f"failed to load model: {e}")


VARIANT_PRESETS = {
    "gallery-cover": {
        "prefix": "album cover art, music-themed, vibrant, square composition, professional",
        "negative": "text, watermark, logo, ugly, low quality, blurry, deformed",
        "width": 1024,
        "height": 1024,
    },
    "land-parcel": {
        "prefix": "top-down view, terrain map, satellite imagery, geographic, detailed",
        "negative": "people, faces, text, watermark, low quality",
        "width": 1024,
        "height": 1024,
    },
    "skybox": {
        "prefix": "panoramic landscape, atmospheric, photorealistic, wide angle, no horizon distortion",
        "negative": "people, vehicles, text, watermark",
        "width": 1536,
        "height": 768,
    },
    # Phase 16.1 — Character Designer AI BUILD tab (NBA2K-style player builds)
    "character-portrait": {
        "prefix": "full body character portrait, photorealistic, centered, neutral pose, clean background, video game character render",
        "negative": "watermark, text, logo, multiple people, deformed anatomy, extra limbs, low quality, blurry",
        "width": 768,
        "height": 1024,
    },
    "character-face": {
        "prefix": "character face portrait, close-up, photorealistic, neutral expression, even lighting, video game character render",
        "negative": "watermark, text, logo, multiple faces, deformed, low quality",
        "width": 768,
        "height": 768,
    },
}


class GenerateRequest(BaseModel):
    prompt: str
    variant: Optional[str] = None  # "gallery-cover" | "land-parcel" | "skybox"
    width: Optional[int] = None
    height: Optional[int] = None
    steps: int = 25
    seed: Optional[int] = None
    negative_prompt: Optional[str] = None


app = FastAPI(title="Lucy SDXL", version="0.1.0")


@app.get("/")
def health():
    return {
        "status": "lucy-sdxl",
        "model": MODEL_ID,
        "device": DEVICE,
        "loaded": _pipeline is not None,
        "uptime_s": round(time.time() - _start_time, 1),
        "variants": list(VARIANT_PRESETS.keys()),
    }


@app.post("/generate")
def generate(req: GenerateRequest):
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(400, "prompt required")
    if len(prompt) > 2000:
        prompt = prompt[:2000]

    # Apply variant preset if provided — wraps user prompt with style anchors
    preset = VARIANT_PRESETS.get(req.variant or "", {}) if req.variant else {}
    final_prompt = f"{preset.get('prefix', '')}, {prompt}".strip(", ")
    final_negative = req.negative_prompt or preset.get("negative", "")
    final_width = req.width or preset.get("width", 1024)
    final_height = req.height or preset.get("height", 1024)

    pipe = _load_pipeline()

    import torch
    generator = None
    if req.seed is not None:
        generator = torch.Generator(device=DEVICE).manual_seed(int(req.seed))

    result = pipe(
        prompt=final_prompt,
        negative_prompt=final_negative or None,
        width=final_width,
        height=final_height,
        num_inference_steps=max(10, min(60, int(req.steps))),
        generator=generator,
    )
    image = result.images[0]

    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")
