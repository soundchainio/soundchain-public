/**
 * POST /api/character/generate-portrait
 *
 * Vercel proxy to anvil's Lucy SDXL — Character Designer AI BUILD tab.
 * Generates NBA2K-style full-body player portraits from text prompts.
 *
 * Body:
 *   {
 *     prompt: string,              // required, e.g. "athletic 6'2 male with short
 *                                  //   dreads, blue hoodie, ripped jeans, white sneakers"
 *     [variant?: "portrait" | "face"]  // 'portrait' = full body, 'face' = close-up
 *     [steps?: number]             // 10-60, default 30 for quality
 *     [seed?: number]              // pass handle-hash for deterministic regeneration
 *   }
 *
 * Returns PNG bytes. Caller stores the data URL in CharacterConfig.aiPortraitUrl
 * and persists via /api/profile/character. The portrait becomes the visual
 * representation of the user's avatar in Explore3D.
 *
 * 24h cache because same seed = same portrait.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const SDXL_URL = process.env.SDXL_URL || ''

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 120,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!SDXL_URL) {
    return res.status(503).json({
      error: 'SDXL_URL not configured. Stand up lucy-sdxl on anvil and set SDXL_URL on Vercel.',
      fallback: 'use-default-avatar',
    })
  }

  const { prompt, variant, steps, seed } = (req.body || {}) as {
    prompt?: string
    variant?: 'portrait' | 'face'
    steps?: number
    seed?: number
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'prompt required (min 5 chars — describe the character)' })
  }

  const sdxlVariant = variant === 'face' ? 'character-face' : 'character-portrait'

  try {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 110_000)
    const upstream = await fetch(`${SDXL_URL.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.slice(0, 2000),
        variant: sdxlVariant,
        // Default 30 steps for character work — higher detail than 25 default
        steps: typeof steps === 'number' ? Math.max(10, Math.min(60, steps)) : 30,
        seed: typeof seed === 'number' ? seed : undefined,
      }),
      signal: ctl.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return res.status(502).json({
        error: `anvil sdxl returned ${upstream.status}`,
        detail: text.slice(0, 300),
        fallback: 'use-default-avatar',
      })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    return res.status(200).send(buf)
  } catch (err: any) {
    return res.status(502).json({
      error: err?.name === 'AbortError' ? 'sdxl timed out (~110s ceiling)' : err?.message || 'unreachable',
      fallback: 'use-default-avatar',
    })
  }
}
