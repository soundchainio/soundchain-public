#!/usr/bin/env python3
"""
Lucy TripoSR — Phase 16.3 of the Lucy stack.

FastAPI server on anvil that exposes single-image → 3D mesh generation.
Powers Character Designer Phase 16.3 (NBA2K-style player builds → rotatable
GLB). Same anvil RTX 5000, different model, different port.

Input: an SDXL-generated character portrait (PNG/JPEG)
Output: GLB bytes (binary glTF) — drop straight into Three.js GLTFLoader

Model: TripoSR (stabilityai/TripoSR) — 550M param transformer that takes
a single reference image and outputs a textured mesh in ~10-30s on RTX 5000.

Endpoints:
  GET  /              → health (status, model, uptime)
  POST /generate-mesh → { image_b64: str, [resolution: int = 256],
                          [remove_bg: bool = true] }
                       returns model/gltf-binary bytes

Mode flag: set LUCY_TRIPO_MODEL via systemd Environment to swap to
InstantMesh / Hunyuan3D-2 / Stable Fast 3D when ready.
"""
import base64
import io
import os
import sys
import time
from typing import Optional

# TripoSR ships as a HF Space repo (not a pip package). Clone is at
# /home/soundchain/TripoSR; add its root to sys.path so `from tsr.system
# import TSR` resolves cleanly.
TRIPO_REPO = os.environ.get("LUCY_TRIPO_REPO", "/home/soundchain/TripoSR")
if TRIPO_REPO and os.path.isdir(TRIPO_REPO) and TRIPO_REPO not in sys.path:
    sys.path.insert(0, TRIPO_REPO)

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel


MODEL_ID = os.environ.get("LUCY_TRIPO_MODEL", "stabilityai/TripoSR")
DEVICE = os.environ.get("LUCY_TRIPO_DEVICE", "cuda:0")  # RTX 5000 = cuda:0
DEFAULT_RESOLUTION = int(os.environ.get("LUCY_TRIPO_RESOLUTION", "256"))

# Lazy-load pipeline + background remover on first request
_pipeline = None
_bg_remover = None
_start_time = time.time()


def _load_pipeline():
    """Load TripoSR pipeline lazily. First call downloads weights (~1.5GB)
    and shifts to GPU; subsequent calls reuse the loaded pipeline."""
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        import torch
        from tsr.system import TSR
        _pipeline = TSR.from_pretrained(
            MODEL_ID,
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        _pipeline.renderer.set_chunk_size(8192)
        _pipeline.to(DEVICE)
        return _pipeline
    except Exception as e:
        raise HTTPException(503, f"failed to load TripoSR model: {e}")


def _load_bg_remover():
    """rembg for transparent background — improves mesh quality dramatically.
    Falls back to no-op if rembg unavailable."""
    global _bg_remover
    if _bg_remover is not None:
        return _bg_remover
    try:
        import rembg
        _bg_remover = rembg.new_session()
        return _bg_remover
    except Exception:
        return None


class GenerateMeshRequest(BaseModel):
    image_b64: str          # base64-encoded PNG or JPEG bytes
    resolution: Optional[int] = None  # marching-cubes resolution (128-512)
    remove_bg: bool = True


app = FastAPI(title="Lucy TripoSR", version="0.1.0")


@app.get("/")
def health():
    return {
        "status": "lucy-tripo",
        "model": MODEL_ID,
        "device": DEVICE,
        "loaded": _pipeline is not None,
        "bg_remover_loaded": _bg_remover is not None,
        "uptime_s": round(time.time() - _start_time, 1),
        "default_resolution": DEFAULT_RESOLUTION,
    }


@app.post("/generate-mesh")
def generate_mesh(req: GenerateMeshRequest):
    from PIL import Image
    import numpy as np

    # 1. Decode + sanity-check the image
    try:
        raw = base64.b64decode(req.image_b64, validate=False)
    except Exception as e:
        raise HTTPException(400, f"bad image_b64: {e}")
    if len(raw) < 100:
        raise HTTPException(400, "image_b64 too small to be valid")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"image decode failed: {e}")

    # 2. Remove background (optional but recommended — TripoSR quality
    # collapses on busy backgrounds since it interprets them as geometry)
    if req.remove_bg:
        remover = _load_bg_remover()
        if remover is not None:
            try:
                import rembg
                bg_removed = rembg.remove(img, session=remover)
                # Composite onto neutral grey for stable TSR input
                if bg_removed.mode == "RGBA":
                    bg = Image.new("RGB", bg_removed.size, (127, 127, 127))
                    bg.paste(bg_removed, mask=bg_removed.split()[3])
                    img = bg
            except Exception:
                pass  # graceful fallback to original image

    # 3. Run TripoSR — single-image → scene code → marching-cubes mesh.
    # has_vertex_color=True returns per-vertex RGB colors (TripoSR doesn't
    # produce UV-mapped textures, so vertex colors are how we get colored
    # output instead of gray meshes).
    pipe = _load_pipeline()
    try:
        import torch
        with torch.no_grad():
            scene_codes = pipe([img], device=DEVICE)
        resolution = max(128, min(512, req.resolution or DEFAULT_RESOLUTION))
        meshes = pipe.extract_mesh(scene_codes, has_vertex_color=True, resolution=resolution)
    except Exception as e:
        raise HTTPException(500, f"mesh extraction failed: {e}")

    if not meshes or len(meshes) == 0:
        raise HTTPException(500, "TripoSR returned no meshes")

    # 4. Export to GLB binary — trimesh handles the conversion
    try:
        glb_buf = io.BytesIO()
        meshes[0].export(glb_buf, file_type="glb")
        glb_buf.seek(0)
        return Response(
            content=glb_buf.getvalue(),
            media_type="model/gltf-binary",
        )
    except Exception as e:
        raise HTTPException(500, f"glb export failed: {e}")
