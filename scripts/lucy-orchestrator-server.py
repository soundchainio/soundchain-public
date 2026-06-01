#!/usr/bin/env python3
"""
Lucy Orchestrator — the "team in unison" control plane on anvil.

Sits in FRONT of anvil's Ollama and routes every request to the BEST local
model instead of always hitting llama3.1:8b. This is the brain behind Lucy's
[handoff]: the PWA front-door (Llama 3.2 3B on the phone) hands hard turns to
norman → here, and here picks the right specialist on anvil's 4x RTX 5000 pool.

WHY THIS EXISTS
  Before: Lucy PWA [handoff] → /api/chat → norman → Ollama (llama3.1:8b ONLY).
  After:  Lucy PWA [handoff] → /api/chat → norman → THIS → best local model.
  You have 9 models pulled on anvil and were using one. This uses the rest.

DESIGN (keep it boring + deterministic — the feedback's whole point)
  - Drop-in compatible: exposes POST /api/chat with the SAME request shape
    ({messages:[...], model?, images?}) and SAME NDJSON streaming response
    ({message:{content}, done}) that Ollama /api/chat returns. So Vercel's
    /api/chat can point at this with ZERO client change.
  - The MODEL never decides the route — THIS code does, by inspecting the last
    user message + flags. Cheap keyword/heuristic classifier. (You can make it
    smarter later, but deterministic-first means it never confabulates a route.)
  - Routes ONLY to LOCAL Ollama models on anvil. No paid third-party APIs in the
    user path — ever (Frank's hard rule: no rate-limits, no vendor lock).
  - Honest fallback: if a chosen model isn't pulled, fall back to DEFAULT and
    add an X-Lucy-Route header so you can see what happened.

ROUTING TIERS (edit MODELS below to taste — all must be `ollama pull`ed)
  vision     — message carries image(s)            → llava:7b
  reason     — hard reasoning / code / math / review→ mixtral:8x22b   (your big
               brain, ALREADY pulled — 140B. Swap to llama3.3:70b once pulled.)
  fast       — short casual / greeting / phrasing   → llama3.1:latest
  default    — everything else                      → llama3.1:latest

  (image-GENERATION via x/z-image-turbo is a different API shape — not wired
   into chat streaming here; route it from a dedicated /api/generate instead.)

RUNS as systemd unit (lucy-orchestrator.service) on port 11438.
Reverse-SSH tunnel forwards anvil:11438 → EC2:11438.
EC2 nginx exposes it; Vercel /api/chat proxies to it (point NORMAN_URL or a new
ORCHESTRATOR_URL at it). See lucy-orchestrator-install.md for the wiring.

Self-contained: stdlib + httpx + fastapi + uvicorn (already in the piper-venv).
"""
import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse

# ── Config (edit these in FURL; they're the whole control surface) ───────────
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")

# Map each ROUTE → the local Ollama model that serves it. Every value here MUST
# be a model you've `ollama pull`ed on anvil (check: `ollama list`). To upgrade
# the reasoner the day you pull llama3.3:70b, change ONE line: reason → that.
MODELS = {
    "vision":  os.environ.get("LUCY_MODEL_VISION",  "llava:7b"),
    "reason":  os.environ.get("LUCY_MODEL_REASON",  "mixtral:8x22b"),
    "fast":    os.environ.get("LUCY_MODEL_FAST",    "llama3.1:latest"),
    "default": os.environ.get("LUCY_MODEL_DEFAULT", "llama3.1:latest"),
}

# Per-route generation options (mixtral is big/slow → cap its output so an
# interactive handoff doesn't run for a minute; tune freely).
ROUTE_OPTIONS = {
    "reason":  {"temperature": 0.4, "num_predict": 800},
    "vision":  {"temperature": 0.5, "num_predict": 512},
    "fast":    {"temperature": 0.7, "num_predict": 512},
    "default": {"temperature": 0.7, "num_predict": 600},
}

REQUEST_TIMEOUT = float(os.environ.get("LUCY_ORCH_TIMEOUT", "180"))  # mixtral is slow

# ── Classifier (deterministic — code decides the route, never the model) ─────
# Hard-reasoning signals: route to the big brain (mixtral / 70b).
REASON_RE = re.compile(
    r"\b(analy[sz]e|review|reason|explain why|prove|calculate|compute|solve|"
    r"debug|refactor|optimi[sz]e|architect|design (?:a|the|my)|"
    r"step[- ]by[- ]step|trade[- ]?off|compare|evaluate|audit|"
    r"write (?:code|a function|a script|a contract)|solidity|algorithm|"
    r"why (?:does|did|is|are|would)|how (?:does|do|would) .* work)\b",
    re.IGNORECASE,
)
# Code fences / math symbols are also strong reason signals.
CODE_RE = re.compile(r"```|\bfunction\b|\bclass\b|=>|\bint\b|\breturn\b|[∑∫√π]|\\frac|\^2\b")

# Casual/short → fast model. (Greetings, hype, one-liners.)
def _is_casual(text: str) -> bool:
    t = text.strip()
    if len(t) <= 60 and "?" not in t:
        return True
    return bool(re.match(r"^(hi|hey|yo|sup|lol|lmao|gm|gn|thanks|thank you|ok|okay|"
                         r"nice|cool|word|bet|lfg|fire|love it|haha)\b", t, re.IGNORECASE))


def classify(messages: List[Dict[str, Any]], has_images: bool) -> str:
    if has_images:
        return "vision"
    # last user message drives the route
    last_user = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user = str(m.get("content") or "")
            break
    if REASON_RE.search(last_user) or CODE_RE.search(last_user):
        return "reason"
    if _is_casual(last_user):
        return "fast"
    return "default"


def _pull_set() -> set:
    """Models actually pulled on anvil right now (so we never route to a 404)."""
    try:
        r = httpx.get(f"{OLLAMA}/api/tags", timeout=5)
        return {m["name"] for m in r.json().get("models", [])}
    except Exception:
        return set()


app = FastAPI(title="Lucy Orchestrator", version="1.0")


@app.get("/health")
def health():
    pulled = sorted(_pull_set())
    routes = {k: (v, "ok" if v in pulled else "NOT PULLED") for k, v in MODELS.items()}
    return {"ok": True, "ollama": OLLAMA, "routes": routes, "pulled": pulled}


@app.post("/api/chat")
async def chat(request: Request):
    """Ollama-compatible chat. Routes to the best local model, streams NDJSON."""
    body = await request.json()
    messages: List[Dict[str, Any]] = body.get("messages") or []
    # images can ride on a message (Ollama multimodal) or a top-level field
    has_images = bool(body.get("images")) or any(m.get("images") for m in messages)

    # Caller can force a model (debug); otherwise we route.
    forced = body.get("model")
    route = "forced" if forced else classify(messages, has_images)
    pulled = _pull_set()
    model = forced or MODELS.get(route, MODELS["default"])
    # Safety: if the routed model isn't pulled, degrade to default, then to
    # anything pulled — never 404 the user.
    if pulled and model not in pulled:
        model = MODELS["default"] if MODELS["default"] in pulled else (next(iter(pulled)) if pulled else model)
        route = f"{route}->fallback"

    options = ROUTE_OPTIONS.get(route, ROUTE_OPTIONS["default"]) if not forced else {}
    upstream_body = {"messages": messages, "model": model, "stream": True}
    if options:
        upstream_body["options"] = options
    if has_images and body.get("images"):
        upstream_body["images"] = body["images"]

    async def gen():
        # Emit a tiny preamble line the client ignores but logs can read:
        # which model handled it. (Ollama clients tolerate extra json lines that
        # have no message.content + done:false.)
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                async with client.stream("POST", f"{OLLAMA}/api/chat", json=upstream_body) as resp:
                    if resp.status_code != 200:
                        yield json.dumps({"message": {"content": f"(orchestrator: upstream {resp.status_code})"}, "done": True}) + "\n"
                        return
                    async for line in resp.aiter_lines():
                        if line.strip():
                            yield line + "\n"
        except Exception as e:
            yield json.dumps({"message": {"content": f"(orchestrator error: {e})"}, "done": True}) + "\n"

    return StreamingResponse(
        gen(),
        media_type="application/x-ndjson",
        headers={"X-Lucy-Route": route, "X-Lucy-Model": model},
    )


# Convenience: also accept the bare Ollama path so this can stand in for Ollama
# entirely if you point norman at it directly.
@app.post("/chat")
async def chat_alias(request: Request):
    return await chat(request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("LUCY_ORCH_PORT", "11438")))
