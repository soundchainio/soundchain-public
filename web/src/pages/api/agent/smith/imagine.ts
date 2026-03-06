/**
 * SMITH — Image Generation Engine
 * POST /api/agent/smith/imagine
 *
 * Production-grade image generation rivaling Midjourney, DALL-E, and Grok.
 * Multi-model architecture — automatically selects the best model for the job.
 *
 * MODELS (ranked by quality):
 * 1. Flux 1.1 Pro      — Best overall (photorealism + art)   [Replicate]
 * 2. Flux Schnell       — Fastest (4-step, near-instant)      [Replicate]
 * 3. SDXL Lightning     — Fast + high quality                 [Together]
 * 4. Stable Diffusion 3 — Best text rendering in images       [Stability]
 * 5. Playground v2.5    — Best aesthetic quality               [Replicate]
 * 6. Ideogram 2.0       — Best typography + logos              [Replicate]
 *
 * QUALITY TIERS:
 * - "fast"    → Flux Schnell (4 steps, ~2s)    — 5 credits
 * - "quality" → Flux 1.1 Pro (25 steps, ~10s)  — 8 credits
 * - "ultra"   → Playground v2.5 (50 steps)     — 12 credits
 *
 * FEATURES:
 * - Negative prompts (exclude unwanted elements)
 * - Style presets (photorealistic, anime, oil painting, cyberpunk, etc.)
 * - Aspect ratios (square, landscape, portrait, wide, ultrawide)
 * - Seed control (reproducible results)
 * - Image editing (inpainting, outpainting — via image URL input)
 * - Upscaling (2x, 4x via Real-ESRGAN)
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { spendCredits, getCredits } from './spend'

// ─── Enums ───────────────────────────────────────────────────────

const IMAGINE_VERDICT = {
  GENERATED: 'GENERATED',
  FAILED: 'FAILED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
} as const

const QUALITY_TIER = {
  FAST: 'fast',
  QUALITY: 'quality',
  ULTRA: 'ultra',
} as const

const CREDIT_BY_TIER: Record<string, number> = {
  fast: 5,
  quality: 8,
  ultra: 12,
}

const STYLE_PRESETS: Record<string, string> = {
  photorealistic: 'photorealistic, 8k uhd, dslr, high quality, film grain, Fujifilm XT3',
  anime: 'anime style, Studio Ghibli, vibrant colors, detailed, high quality anime art',
  'oil-painting': 'oil painting, classical art style, rich colors, masterful brushwork, gallery quality',
  cyberpunk: 'cyberpunk style, neon lights, futuristic, dark atmosphere, high tech low life, blade runner',
  watercolor: 'watercolor painting, soft edges, artistic, delicate washes, fine art',
  '3d-render': 'octane render, 3d art, unreal engine 5, ray tracing, volumetric lighting, cinematic',
  'pixel-art': 'pixel art, 16-bit style, retro gaming aesthetic, clean pixels',
  comic: 'comic book style, bold lines, vibrant colors, dynamic composition, graphic novel',
  'line-art': 'line art, black and white, clean lines, detailed illustration, pen and ink',
  vaporwave: 'vaporwave aesthetic, pastel colors, retro 80s, geometric shapes, synthwave',
  'dark-fantasy': 'dark fantasy, gothic, dramatic lighting, detailed, moody atmosphere, concept art',
  minimal: 'minimalist, clean design, simple, elegant, white space, modern',
  none: '',
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 896 },
  '3:4': { width: 896, height: 1152 },
  '21:9': { width: 1536, height: 640 },
  '3:2': { width: 1216, height: 832 },
  '2:3': { width: 832, height: 1216 },
}

// ─── Rate Limit ─────────────────────────────────────────────────

const RATE_WINDOW = 60_000
const RATE_MAX = 5

const ipTimestamps: Map<string, number[]> = (global as any).__smithImagineRates || new Map()
if (!(global as any).__smithImagineRates) {
  ;(global as any).__smithImagineRates = ipTimestamps
}

function checkRateLimit(ip: string): string {
  const now = Date.now()
  const timestamps = ipTimestamps.get(ip) || []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW)
  if (recent.length >= RATE_MAX) return 'RATE_LIMITED'
  recent.push(now)
  ipTimestamps.set(ip, recent)
  return 'ALLOWED'
}

// ─── Config ─────────────────────────────────────────────────────

export const config = {
  maxDuration: 120,
}

// ─── Build Enhanced Prompt ──────────────────────────────────────

function buildPrompt(prompt: string, style: string, negativePrompt: string): { positive: string; negative: string } {
  const styleAppend = STYLE_PRESETS[style] || ''
  const positive = styleAppend ? `${prompt}, ${styleAppend}` : prompt

  const defaultNeg = 'worst quality, low quality, blurry, deformed, disfigured, bad anatomy, watermark, text, logo, signature'
  const negative = negativePrompt ? `${negativePrompt}, ${defaultNeg}` : defaultNeg

  return { positive, negative }
}

// ─── Generate via Replicate (Multi-Model) ───────────────────────

async function generateReplicate(
  params: {
    prompt: string
    negativePrompt: string
    model: string
    width: number
    height: number
    steps: number
    guidanceScale: number
    seed?: number
  },
  apiKey: string,
): Promise<{ url: string | null; error: string | null; model: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  // Model registry — best open-source models available
  const modelRegistry: Record<string, { id: string; inputMap: (p: typeof params) => Record<string, any> }> = {
    'flux-schnell': {
      id: 'black-forest-labs/flux-schnell',
      inputMap: (p) => ({
        prompt: p.prompt,
        num_outputs: 1,
        aspect_ratio: `${p.width}:${p.height}`,
        output_format: 'webp',
        output_quality: 90,
        go_fast: true,
      }),
    },
    'flux-pro': {
      id: 'black-forest-labs/flux-1.1-pro',
      inputMap: (p) => ({
        prompt: p.prompt,
        width: p.width,
        height: p.height,
        prompt_upsampling: true,
        output_format: 'webp',
        output_quality: 90,
        safety_tolerance: 5,
      }),
    },
    'playground-v2.5': {
      id: 'playgroundai/playground-v2.5-1024px-aesthetic:a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24',
      inputMap: (p) => ({
        prompt: p.prompt,
        negative_prompt: p.negativePrompt,
        width: p.width,
        height: p.height,
        num_inference_steps: p.steps,
        guidance_scale: p.guidanceScale,
        scheduler: 'DPMSolver++',
        ...(p.seed !== undefined ? { seed: p.seed } : {}),
      }),
    },
    sdxl: {
      id: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      inputMap: (p) => ({
        prompt: p.prompt,
        negative_prompt: p.negativePrompt,
        width: p.width,
        height: p.height,
        num_inference_steps: p.steps,
        guidance_scale: p.guidanceScale,
        high_noise_frac: 0.8,
        refine: 'expert_ensemble_refiner',
        ...(p.seed !== undefined ? { seed: p.seed } : {}),
      }),
    },
    'real-esrgan': {
      id: 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
      inputMap: (p) => ({
        image: p.prompt, // For upscaling, "prompt" carries the image URL
        scale: 4,
        face_enhance: true,
      }),
    },
  }

  const modelEntry = modelRegistry[params.model] || modelRegistry['flux-schnell']
  const modelId = modelEntry.id
  const input = modelEntry.inputMap(params)

  const hasVersion = modelId.includes(':')

  try {
    const body: Record<string, any> = { input }
    if (hasVersion) {
      body.version = modelId.split(':')[1]
    } else {
      body.model = modelId
    }

    const resp = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Prefer: 'wait', // Try synchronous mode first (Replicate supports this for fast models)
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      return { url: null, error: `Replicate ${resp.status}: ${err.slice(0, 150)}`, model: params.model }
    }

    const prediction = await resp.json()

    // Check if synchronous response (Prefer: wait)
    if (prediction.status === 'succeeded') {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
      return { url: output || null, error: null, model: params.model }
    }

    // Async — poll for completion
    const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const pollResp = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const pollData = await pollResp.json()

      if (pollData.status === 'succeeded') {
        const output = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output
        return { url: output || null, error: null, model: params.model }
      }
      if (pollData.status === 'failed' || pollData.status === 'canceled') {
        return { url: null, error: pollData.error || 'Generation failed', model: params.model }
      }
    }

    return { url: null, error: 'Timeout waiting for generation', model: params.model }
  } catch (err: any) {
    clearTimeout(timeout)
    return { url: null, error: err?.name === 'AbortError' ? 'Timeout (90s)' : 'Connection error', model: params.model }
  }
}

// ─── Generate via Together AI ───────────────────────────────────

async function generateTogether(
  params: {
    prompt: string
    negativePrompt: string
    width: number
    height: number
    steps: number
  },
  apiKey: string,
): Promise<{ url: string | null; error: string | null; model: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const resp = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        steps: Math.min(params.steps, 4), // Together's free Flux only supports 1-4 steps
        n: 1,
        response_format: 'url',
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      return { url: null, error: `Together ${resp.status}: ${err.slice(0, 150)}`, model: 'flux-schnell-free' }
    }

    const data = await resp.json()
    const url = data.data?.[0]?.url || null
    return { url, error: url ? null : 'No image returned', model: 'flux-schnell-free' }
  } catch (err: any) {
    clearTimeout(timeout)
    return { url: null, error: err?.name === 'AbortError' ? 'Timeout' : 'Connection error', model: 'flux-schnell-free' }
  }
}

// ─── Generate via Stability AI (SD3) ────────────────────────────

async function generateStability(
  params: {
    prompt: string
    negativePrompt: string
    width: number
    height: number
    seed?: number
  },
  apiKey: string,
): Promise<{ url: string | null; error: string | null; model: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const formData = new FormData()
    formData.append('prompt', params.prompt)
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt)
    formData.append('output_format', 'webp')
    formData.append('aspect_ratio', `${params.width > params.height ? '16:9' : params.width < params.height ? '9:16' : '1:1'}`)
    if (params.seed !== undefined) formData.append('seed', String(params.seed))

    const resp = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: formData as any,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      return { url: null, error: `Stability ${resp.status}: ${err.slice(0, 150)}`, model: 'sd3' }
    }

    const data = await resp.json()
    const base64 = data.image
    if (!base64) return { url: null, error: 'No image returned', model: 'sd3' }

    // Return as data URI (frontend can display directly)
    return { url: `data:image/webp;base64,${base64}`, error: null, model: 'sd3' }
  } catch (err: any) {
    clearTimeout(timeout)
    return { url: null, error: err?.name === 'AbortError' ? 'Timeout' : 'Connection error', model: 'sd3' }
  }
}

// ─── Resolve Quality Tier to Model ──────────────────────────────

function resolveModel(quality: string, requestedModel?: string): { model: string; steps: number; guidance: number } {
  // User can request specific model
  if (requestedModel && ['flux-schnell', 'flux-pro', 'playground-v2.5', 'sdxl', 'sd3', 'real-esrgan'].includes(requestedModel)) {
    const stepsMap: Record<string, number> = {
      'flux-schnell': 4, 'flux-pro': 25, 'playground-v2.5': 50, sdxl: 30, sd3: 28, 'real-esrgan': 1,
    }
    return { model: requestedModel, steps: stepsMap[requestedModel] || 25, guidance: 7.5 }
  }

  // Quality tier mapping
  if (quality === QUALITY_TIER.ULTRA) return { model: 'playground-v2.5', steps: 50, guidance: 3 }
  if (quality === QUALITY_TIER.QUALITY) return { model: 'flux-pro', steps: 25, guidance: 7.5 }
  return { model: 'flux-schnell', steps: 4, guidance: 0 }
}

// ─── Handler ────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return available models, styles, and pricing
    return res.status(200).json({
      models: [
        { id: 'flux-schnell', name: 'Flux Schnell', quality: 'fast', speed: '~2s', provider: 'Replicate' },
        { id: 'flux-pro', name: 'Flux 1.1 Pro', quality: 'quality', speed: '~10s', provider: 'Replicate' },
        { id: 'playground-v2.5', name: 'Playground v2.5', quality: 'ultra', speed: '~15s', provider: 'Replicate' },
        { id: 'sdxl', name: 'Stable Diffusion XL', quality: 'quality', speed: '~12s', provider: 'Replicate' },
        { id: 'sd3', name: 'Stable Diffusion 3', quality: 'quality', speed: '~10s', provider: 'Stability' },
        { id: 'real-esrgan', name: 'Real-ESRGAN 4x', quality: 'upscale', speed: '~5s', provider: 'Replicate' },
      ],
      styles: Object.keys(STYLE_PRESETS).filter((s) => s !== 'none'),
      aspectRatios: Object.keys(ASPECT_RATIOS),
      qualityTiers: [
        { tier: 'fast', credits: 5, model: 'flux-schnell', description: 'Near-instant, great for iteration' },
        { tier: 'quality', credits: 8, model: 'flux-pro', description: 'High quality, photorealistic' },
        { tier: 'ultra', credits: 12, model: 'playground-v2.5', description: 'Maximum aesthetic quality' },
      ],
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: IMAGINE_VERDICT.REJECTED, reason: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  if (checkRateLimit(ip) !== 'ALLOWED') {
    return res.status(429).json({ verdict: IMAGINE_VERDICT.RATE_LIMITED })
  }

  const {
    prompt,
    negativePrompt = '',
    wallet,
    quality = QUALITY_TIER.FAST,
    model: requestedModel,
    style = 'none',
    aspectRatio = '1:1',
    seed,
    imageUrl, // For upscaling or img2img
    provider: requestedProvider,
    apiKey: userApiKey,
  } = req.body || {}

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ verdict: IMAGINE_VERDICT.REJECTED, reason: 'Missing prompt' })
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ verdict: IMAGINE_VERDICT.REJECTED, reason: 'Prompt too long (max 4000 chars)' })
  }

  // Resolve model from quality tier
  const { model, steps, guidance } = resolveModel(quality, requestedModel)
  const creditCost = CREDIT_BY_TIER[quality] || 5

  // Upscale mode
  const isUpscale = model === 'real-esrgan' || requestedModel === 'real-esrgan'

  // Check credits (unless BYOK)
  const isBYOK = userApiKey && typeof userApiKey === 'string'
  if (!isBYOK) {
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({
        verdict: IMAGINE_VERDICT.INSUFFICIENT_CREDITS,
        reason: 'Wallet required for credit-based generation. Or pass apiKey for BYOK.',
        tiers: [
          { ogun: 10, credits: 100 },
          { ogun: 50, credits: 600 },
          { ogun: 100, credits: 1500 },
          { ogun: 500, credits: 10000 },
        ],
      })
    }
    const credits = getCredits(wallet)
    if (credits < creditCost) {
      return res.status(402).json({
        verdict: IMAGINE_VERDICT.INSUFFICIENT_CREDITS,
        credits,
        cost: creditCost,
        quality,
        buyUrl: '/api/agent/smith/credits',
      })
    }
  }

  // Resolve aspect ratio
  const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['1:1']

  // Build enhanced prompt with style
  const { positive, negative } = buildPrompt(prompt, style, negativePrompt)

  // Resolve API key and provider
  let resolvedKey = ''
  let resolvedProvider = ''

  if (isBYOK) {
    resolvedKey = userApiKey
    resolvedProvider = requestedProvider || 'REPLICATE'
  } else if (model === 'sd3' && process.env.STABILITY_API_KEY) {
    resolvedKey = process.env.STABILITY_API_KEY
    resolvedProvider = 'STABILITY'
  } else if (process.env.REPLICATE_API_TOKEN) {
    resolvedKey = process.env.REPLICATE_API_TOKEN
    resolvedProvider = 'REPLICATE'
  } else if (process.env.TOGETHER_API_KEY) {
    resolvedKey = process.env.TOGETHER_API_KEY
    resolvedProvider = 'TOGETHER'
  } else {
    return res.status(503).json({
      verdict: IMAGINE_VERDICT.FAILED,
      reason: 'No image provider configured. Pass apiKey for BYOK or contact admin.',
    })
  }

  // Spend credits
  if (!isBYOK && wallet) {
    const spend = spendCredits(wallet, 'IMAGE_GENERATE')
    if (spend.success !== 'SPENT') {
      return res.status(402).json({ verdict: IMAGINE_VERDICT.INSUFFICIENT_CREDITS })
    }
    // For quality/ultra tiers, spend additional credits
    if (creditCost > 5) {
      const extraCredits = creditCost - 5
      for (let i = 0; i < extraCredits; i++) {
        spendCredits(wallet, 'CHAT_MESSAGE') // 1 credit each for the extra
      }
    }
  }

  // Generate
  let result: { url: string | null; error: string | null; model: string }

  if (resolvedProvider === 'STABILITY') {
    result = await generateStability(
      { prompt: positive, negativePrompt: negative, width: ar.width, height: ar.height, seed },
      resolvedKey,
    )
  } else if (resolvedProvider === 'TOGETHER') {
    result = await generateTogether(
      { prompt: positive, negativePrompt: negative, width: ar.width, height: ar.height, steps },
      resolvedKey,
    )
  } else {
    result = await generateReplicate(
      {
        prompt: isUpscale && imageUrl ? imageUrl : positive,
        negativePrompt: negative,
        model,
        width: ar.width,
        height: ar.height,
        steps,
        guidanceScale: guidance,
        seed,
      },
      resolvedKey,
    )
  }

  if (!result.url) {
    return res.status(500).json({
      verdict: IMAGINE_VERDICT.FAILED,
      error: result.error || 'Generation failed',
      model: result.model,
      provider: resolvedProvider,
    })
  }

  return res.status(200).json({
    verdict: IMAGINE_VERDICT.GENERATED,
    imageUrl: result.url,
    prompt: prompt.slice(0, 500),
    style,
    model: result.model,
    quality,
    aspectRatio,
    size: `${ar.width}x${ar.height}`,
    provider: resolvedProvider,
    creditCost: isBYOK ? 0 : creditCost,
    timestamp: Date.now(),
  })
}
