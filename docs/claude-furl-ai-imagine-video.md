# FURL AI Image & Video Generator — Full Capabilities

**Endpoints:**
- Image: `POST /api/agent/smith/imagine`
- Video: `POST /api/agent/smith/video`
- Credits: `POST /api/agent/smith/credits`

---

## Image Generation (`/api/agent/smith/imagine`)

### 6 Models, 3 Quality Tiers

| Model | Tier | Speed | Best For | Provider |
|-------|------|-------|----------|----------|
| Flux Schnell | Fast | ~2s | Quick iterations, previews | Replicate |
| SDXL Lightning | Fast | ~5s | General purpose | Replicate |
| Stable Diffusion 3 | Fast | ~8s | Photorealism, text in images | Stability AI |
| Flux 1.1 Pro | Quality | ~10s | Production art | Replicate |
| Playground v2.5 | Ultra | ~15s | Maximum aesthetic quality | Replicate |
| Real-ESRGAN | Upscaler | ~5s | 4x upscale existing images | Replicate |

### Credit Cost by Tier

| Tier | Model | Credits |
|------|-------|---------|
| Fast | Flux Schnell | 5 |
| Quality | Flux 1.1 Pro | 8 |
| Ultra | Playground v2.5 | 12 |

### 12 Style Presets

`photorealistic` `anime` `cyberpunk` `oil-painting` `watercolor` `3d-render` `pixel-art` `comic` `line-art` `vaporwave` `dark-fantasy` `minimal`

### 8 Aspect Ratios

`1:1` `16:9` `9:16` `4:3` `3:4` `21:9` `3:2` `2:3`

### Features

- **Negative prompts** — exclude unwanted elements from generation
- **Style presets** — 12 curated styles applied to any prompt
- **Aspect ratios** — 8 options from square to ultrawide
- **Seed control** — reproducible results with deterministic seeds
- **AI upscaling** — 4x resolution boost via Real-ESRGAN
- **Image editing** — pass `imageUrl` for img2img / upscaling workflows
- **3 providers** — Replicate, Together AI, Stability AI
- **BYOK supported** — bring your own API key, skip credits entirely

### Request Body (POST)

```json
{
  "prompt": "cyberpunk cityscape at sunset, neon lights reflecting on wet streets",
  "negativePrompt": "blurry, low quality, watermark",
  "quality": "quality",
  "style": "cyberpunk",
  "aspectRatio": "16:9",
  "seed": 42,
  "wallet": "0x...",
  "apiKey": "r8_...",
  "model": "flux-pro",
  "imageUrl": "https://... (for upscaling/img2img)"
}
```

### Response

```json
{
  "verdict": "GENERATED",
  "imageUrl": "https://replicate.delivery/...",
  "model": "flux-pro",
  "style": "cyberpunk",
  "aspectRatio": "16:9",
  "seed": 42,
  "creditCost": 8,
  "timestamp": 1709654321000
}
```

---

## Video Generation (`/api/agent/smith/video`)

### 3 Models

| Model | Mode | Speed | Best For |
|-------|------|-------|----------|
| Stable Video Diffusion | Image to Video | ~30s | Animating still art, album covers |
| AnimateDiff Lightning | Text to Video | ~45s | Fast text-to-video from prompts |
| Minimax Video-01 | Both | ~60s | Highest quality, supports both modes |

### Credit Cost

All video generation: **15 credits** (or free with BYOK)

### Features

- **Image-to-video** — animate any still image (album art, AI-generated images, photos)
- **Text-to-video** — generate video from text description alone
- **Duration control** — up to 32 frames
- **FPS control** — up to 24 fps
- **Auto mode detection** — pass `imageUrl` for image-to-video, prompt-only for text-to-video
- **BYOK supported** — bring your own Replicate API key

### Request Body (POST)

```json
{
  "prompt": "a vinyl record spinning on a turntable, warm lighting, cinematic",
  "imageUrl": "https://... (optional, triggers image-to-video mode)",
  "model": "minimax-video",
  "duration": 16,
  "fps": 7,
  "wallet": "0x...",
  "apiKey": "r8_..."
}
```

### Response

```json
{
  "verdict": "GENERATED",
  "videoUrl": "https://replicate.delivery/...",
  "mode": "TEXT_TO_VIDEO",
  "model": "minimax-video",
  "prompt": "a vinyl record spinning on a turntable...",
  "creditCost": 15,
  "timestamp": 1709654321000
}
```

---

## Use Cases for SoundChain Creators

### NFT Cover Art
Generate unique album artwork with AI, then mint directly as NFTs on SoundChain. Use style presets like `vaporwave`, `dark-fantasy`, or `photorealistic` to match your sound.

### Animated NFT Editions
Take any still image (generated or uploaded) and animate it with Stable Video Diffusion or Minimax. Turn a cover art into a living, breathing animated NFT edition.

### Music Video Clips
Use text-to-video to create quick promo clips from a description of your track's vibe. Perfect for stories, reels, and social posts.

### Social Feed Content
Generate eye-catching visuals for wall posts, stories, and reels on SoundChain's social feed. Stand out with AI-generated art that matches your brand.

### SCid Uploads
Need cover art for a new SCid track? Generate it right in FURL. Multiple aspect ratios available — square for album art, 9:16 for stories, 16:9 for banners.

### Profile Media
Custom avatars, cover photos, and profile backgrounds. Use the upscaler to enhance existing images to 4x resolution.

---

## OGUN Credit Economy

### Pricing

| Action | Credits |
|--------|---------|
| Image (Fast) | 5 |
| Image (Quality) | 8 |
| Image (Ultra) | 12 |
| Video | 15 |

### Credit Tiers (Buy with OGUN)

| OGUN Spent | Credits Received | Bonus |
|------------|-----------------|-------|
| 10 OGUN | 100 credits | 0% |
| 50 OGUN | 600 credits | 20% |
| 100 OGUN | 1,500 credits | 50% |
| 500 OGUN | 10,000 credits | 100% |

### How It Works

1. User sends OGUN to treasury (`0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b`)
2. Transaction verified on-chain via Polygon RPC
3. Credits credited to wallet address
4. Each generation deducts credits
5. 0.05% of every OGUN purchase goes to treasury as platform fee

### BYOK (Bring Your Own Key)

Users can always bypass credits by passing their own API key:
- `apiKey`: Replicate API token (`r8_...`)
- No credits deducted when using BYOK
- Same models, same quality, zero cost to SoundChain

---

## API Discovery (GET)

### GET `/api/agent/smith/imagine`

Returns available models, styles, aspect ratios, and pricing tiers.

### GET `/api/agent/smith/video`

Returns available models, credit cost, and use cases.

---

## Rate Limits

| Endpoint | Requests | Window |
|----------|----------|--------|
| Imagine | 5 per IP | 60 seconds |
| Video | 3 per IP | 60 seconds |

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `REPLICATE_API_TOKEN` | Primary provider for image + video models |
| `TOGETHER_API_KEY` | Alternative image provider (Together AI) |
| `STABILITY_API_KEY` | Alternative image provider (Stability AI) |

Add `REPLICATE_API_TOKEN` to Vercel to enable platform-key generation. Without it, only BYOK users can generate.

---

## Technical Details

- **Max duration**: 300s (5 min timeout per request)
- **Polling**: Async Replicate predictions polled every 2-3s, up to 120 polls
- **Abort timeout**: 4 minutes for video, 2 minutes for images
- **Zero booleans**: All state uses typed string enums
- **In-memory rate limiting**: Per-IP, resets on cold start
- **Credit store**: In-memory (needs MongoDB migration for persistence)

---

## P2P Decentralized AI Compute Network

### Vision

No Replicate. No centralized GPU farms. SoundChain users ARE the infrastructure. Every user with a GPU becomes a compute node. They earn OGUN for running AI jobs. The network pays for itself through platform fees.

### Why This Kills Replicate/Runway/Midjourney

| | Midjourney | Replicate | SoundChain P2P |
|---|---|---|---|
| Who pays for GPU | Users ($10-30/mo) | Users (per-call) | The network itself |
| Infrastructure | Centralized data centers | Centralized | Distributed users |
| Revenue model | Subscriptions | Pay-per-use | Platform fees fund it |
| Token incentive | None | None | OGUN rewards |
| Scales how | Buy more GPUs | Rent more GPUs | More users = more GPUs |

### The Self-Sustaining Loop

```
EVERY TRANSACTION ON SOUNDCHAIN
        |
        |  0.05% fee
        v
   Treasury (Gnosis Safe)
   0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b
        |
        |---> Pay P2P compute nodes (OGUN rewards)
        |---> Infrastructure costs
        |---> Dev fund
```

### Revenue Sources Already Live

| Transaction Type | Fee | Already Collecting |
|-----------------|-----|--------------------|
| NFT Minting | 0.05% gas | Yes |
| Marketplace Sales | 0.05% price + 0.05% gas | Yes |
| OGUN Transfers | 0.05% | Yes |
| POL Transfers | 0.05% | Yes |
| DEX Swaps | 0.05% | Yes |
| Staking/Unstaking | 0.05% | Yes |
| Profile Tips | 0.05% | Yes |
| AI Generation Credits | OGUN purchase | Yes (new) |

### The Flywheel

```
User mints NFT ----------> 0.05% fee --> Treasury
User tips artist --------> 0.05% fee --> Treasury
User buys AI credits ----> OGUN to Treasury
User swaps tokens -------> 0.05% fee --> Treasury
                                            |
                                            v
                                    Treasury pays OGUN
                                    to compute nodes
                                            |
                    +-----------------------+-----------------------+
                    v                       v                       v
              War Room nodes          Browser nodes           Desktop nodes
              (always on)             (earn while              (dedicated
                                       browsing)               miners)
                    |                       |                       |
                    +-----------------------+-----------------------+
                                            |
                                            v
                                    AI generation completed
                                    (images, videos, future: music)
                                            |
                                            v
                                    Users create more content
                                    More mints, more tips, more swaps
                                            |
                                            v
                                    MORE FEES --> MORE OGUN TO NODES
```

### War Room as Primary GPU Cluster

| Node | Hardware | AI Capability |
|------|----------|---------------|
| ROG (192.168.1.29) | Windows, NVIDIA GPU | Best node -- runs CUDA models natively, ~2-5s per image |
| Fleet Commander | MacBook Pro M-series | Apple Silicon MLX -- runs Flux/SD at ~5-10s per image |
| mini (192.168.1.22) | Mac Mini | Same MLX capability, dedicated inference server |

War Room nodes run ComfyUI (ROG) or mlx-stable-diffusion (Macs). SMITH routes to them via Cloudflare tunnel. Zero external API cost.

### P2P Node Architecture

```
User A wants an image
        |
        v
   SMITH endpoint receives request
        |
        v
   Job Queue (API Gateway)
        |
        |---> War Room nodes (priority, fast)
        |
        |---> P2P browser nodes (users opted-in via WebGPU)
        |         |
        |         |--- User B's RTX 4090 (browser tab open)
        |         |--- User C's M2 Mac (browser tab open)
        |         +--- User D's gaming PC (browser tab open)
        |
        +---> Replicate fallback (if no nodes available)

   Node completes job --> gets OGUN reward
   Result returns to User A
```

### How P2P Browser Nodes Work

1. **WebGPU** -- browsers can now access the GPU directly (Chrome 113+, Edge, Firefox)
2. **Stable Diffusion runs IN THE BROWSER** via WebGPU -- no server needed
3. **ONNX Runtime Web** / **transformers.js** -- Hugging Face models in browser
4. User opens SoundChain, toggles "Contribute GPU" on
5. Browser downloads model weights (cached via IPFS after first load)
6. Job queue assigns generation tasks to available browser nodes
7. Node completes task, submits result, receives OGUN

### Node Reward Structure

| Node Type | Reward per Image | Reward per Video | Requirement |
|-----------|-----------------|------------------|-------------|
| Browser (WebGPU) | 0.5 OGUN | 2 OGUN | Keep tab open |
| Desktop App | 1 OGUN | 3 OGUN | Run background app |
| War Room (always-on) | Platform priority | Platform priority | SoundChain infra |

### ComputeRewards Smart Contract

Similar to `StreamingRewardsDistributor` but for AI compute:

```
Node registers on-chain (stake 10 OGUN minimum)
        |
        v
Node completes AI job --> proof submitted
        |
        v
Treasury releases OGUN reward to node wallet
        |
        v
Node can stake rewards --> earn more from staking too
```

The staking requirement prevents spam nodes submitting garbage results. Stake gets slashed if outputs are invalid.

### Node Reward Math

Example: SoundChain does 1,000 transactions/day (mints, tips, swaps, marketplace):
- Average tx value: 50 OGUN
- 0.05% fee per tx: 0.025 OGUN
- Daily treasury income: ~25 OGUN/day from fees alone
- Plus direct AI credit purchases on top
- As volume grows, treasury grows, more OGUN for nodes, attracting more nodes

### What No One Else Has

- **Filecoin** -- decentralized storage, no AI
- **Render Network** -- decentralized GPU, no social platform
- **Akash** -- decentralized compute, no token economy loop
- **io.net** -- GPU marketplace, no content creation

SoundChain has ALL of it in one platform. Social activity generates fees that pay for AI compute that creates content that drives more social activity. Nobody has closed this loop before.

### Build Phases

**Phase 1 (Now):** War Room nodes as inference servers
- Install ComfyUI on ROG + mlx-stable-diffusion on mini
- SMITH routes to War Room via Cloudflare tunnel
- Free generation, no Replicate dependency

**Phase 2:** ComputeRewards smart contract
- On-chain node registration + OGUN rewards
- Staking requirement (10 OGUN minimum)
- Slash mechanism for invalid outputs

**Phase 3:** WebGPU browser node SDK
- Build `@soundchain/compute-node` -- drops into any page
- WebGPU inference of Flux Schnell (smallest, fastest model)
- "Contribute GPU" toggle on FURL/DEX page
- OGUN rewards per completed job

**Phase 4:** Desktop node app (Electron/Tauri)
- Dedicated compute miners running full SDXL/Flux Pro
- Higher OGUN rewards for desktop nodes (more reliable)
- Leaderboard on `/dex` -- top compute contributors

**Phase 5:** AI music generation
- The endgame -- users generate music, not just images/video
- Same P2P compute network handles audio models
- Full creative suite powered by the community

### Prerequisites

- Run `nvidia-smi` on ROG to identify GPU capabilities
- Add `REPLICATE_API_TOKEN` to Vercel as interim fallback
- War Room Cloudflare tunnel already active for routing

---

## Full Build Checklist — No Replicate, Full P2P

### Already Done

| Component | Status |
|-----------|--------|
| SMITH imagine endpoint | Built |
| SMITH video endpoint | Built |
| OGUN credit system | Built |
| On-chain tx verification | Built |
| Treasury fee collection (0.05%) | Built |
| Credit tiers + BYOK | Built |
| Cloudflare tunnel infra | Built |
| IPFS pinning infra | Built |

### Phase 1: War Room Inference Server (Do First)

| Task | Details |
|------|---------|
| Check ROG GPU | Run `nvidia-smi` on ROG (192.168.1.29) |
| Install ComfyUI on ROG | Python + PyTorch + CUDA, serves REST API |
| Install mlx-stable-diffusion on mini | Apple Silicon native, fast on M-series |
| Download model weights | Flux Schnell (~12GB), SDXL (~7GB) |
| Expose via Cloudflare tunnel | Already have tunnel infra |
| Build inference API wrapper | Simple FastAPI/Express that accepts SMITH-format requests |

### Phase 2: Rewire SMITH Endpoints

| Task | Details |
|------|---------|
| Add War Room as provider in `imagine.ts` | New provider alongside Replicate |
| Add War Room as provider in `video.ts` | Same pattern |
| Provider priority routing | War Room first, P2P second, Replicate fallback |
| Health check endpoint on War Room | SMITH needs to know if nodes are alive |
| Job queue system | Redis or in-memory queue for routing jobs to available nodes |

### Phase 3: P2P Browser Nodes

| Task | Details |
|------|---------|
| WebGPU capability detection | Check if user's browser supports WebGPU |
| Model weight distribution via IPFS | Cache Flux Schnell weights so nodes don't re-download |
| `@soundchain/compute-node` SDK | JS library that runs inference in browser |
| Node registration API | `/api/agent/compute/register` -- node announces availability |
| Job dispatch system | Match pending jobs to available nodes |
| Result verification | Prevent nodes from submitting garbage |
| "Contribute GPU" toggle in FURL UI | User opt-in on the DEX page |

### Phase 4: On-Chain Rewards

| Task | Details |
|------|---------|
| `ComputeRewards.sol` contract | Node staking + reward distribution |
| Node registration on-chain | Stake 10 OGUN to become a node |
| Reward distribution from treasury | Auto-pay OGUN per completed job |
| Slash mechanism | Penalize bad outputs |
| Leaderboard UI | Top compute contributors on `/dex` |

### Phase 5: Desktop Node App

| Task | Details |
|------|---------|
| Electron or Tauri app | Background GPU inference |
| Auto-update model weights | Pull latest models |
| System tray with earnings display | Show OGUN earned |

### When You Get Home — Start Here

1. Run `nvidia-smi` on ROG (192.168.1.29) -- tells us GPU model + VRAM
2. Install ComfyUI on ROG -- `git clone https://github.com/comfyanonymous/ComfyUI && pip install -r requirements.txt`
3. Download Flux Schnell weights -- fastest model, smallest footprint
4. Start ComfyUI server -- `python main.py --listen 0.0.0.0 --port 8188`
5. Test locally -- `curl http://192.168.1.29:8188/prompt` should respond
6. Expose via Cloudflare tunnel -- route SMITH to War Room
7. Tell Claude to rewire `imagine.ts` to hit War Room instead of Replicate
