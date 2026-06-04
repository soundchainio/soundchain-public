import type { NextApiRequest, NextApiResponse } from 'next'

// Beta: require logged-in user (has JWT). Only furdA1 knows the Generate tab exists.
function isAuthenticated(req: NextApiRequest): boolean {
  const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  return !!jwt && jwt.length > 10
}

// Multi-backend router — routes to Imagine Server (diffusers) or Ollama
const BACKENDS: Record<string, { url: string; name: string }> = {
  imagine: {
    url: process.env.IMAGINE_SERVER_URL || 'http://localhost:8190',
    name: 'Imagine Server (diffusers)',
  },
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    name: 'Ollama',
  },
}

async function handleImagine(
  backendUrl: string,
  body: {
    prompt: string
    model?: string
    negativePrompt?: string
    width?: number
    height?: number
    steps?: number
    seed?: number
    cfg?: number
    image?: string
    strength?: number
    referenceImages?: string[]
    faceMode?: boolean
    ipScale?: number
    nsfw?: boolean
  }
) {
  // Timeout: 4.5 minutes (leave buffer within Vercel's 5min maxDuration)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 270_000)

  let res: Response
  try {
    res = await fetch(`${backendUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: body.prompt,
        model: body.model || 'sdxl-turbo',
        negative_prompt: body.negativePrompt || 'ugly, blurry, low quality, deformed, disfigured, watermark, text, bad anatomy',
        width: body.width,
        height: body.height,
        steps: body.steps,
        seed: body.seed ?? -1,
        cfg: body.cfg,
        ...(body.image ? { image: body.image, strength: body.strength ?? 0.7 } : {}),
        reference_images: body.referenceImages || [],
        face_mode: body.faceMode || false,
        ip_adapter_scale: body.ipScale ?? 0.6,
        nsfw: body.nsfw || false,
      }),
      signal: controller.signal,
    })
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      const refCount = body.referenceImages?.length || 0
      throw new Error(
        `Generation timed out after 4.5 minutes.${
          refCount >= 3 ? ' Try fewer reference images or' : ' Try'
        } a faster model (SDXL Turbo) or smaller dimensions.`
      )
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `Imagine server error: ${res.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.detail || errMsg
    } catch {
      errMsg = errText || errMsg
    }
    // Surface OOM and memory errors clearly
    const lower = errMsg.toLowerCase()
    if (lower.includes('out of memory') || lower.includes('oom') || errMsg.includes('CUDA') || lower.includes('killed') || lower.includes('cannot allocate')) {
      const refCount = body.referenceImages?.length || 0
      errMsg = `Server ran out of memory${refCount >= 2 ? ` with ${refCount} reference images` : ''} — try fewer reference images, a faster model (SDXL Turbo), or smaller dimensions.`
    }
    // Surface generic 500 with actionable guidance
    if (res.status === 500 && errMsg === `Imagine server error: 500`) {
      const refCount = body.referenceImages?.length || 0
      errMsg = `Generation failed on the server.${refCount >= 3 ? ' Too many reference images may cause this — try 1-2 instead.' : ''} Try a faster model or smaller dimensions.`
    }
    throw new Error(errMsg)
  }

  const data = await res.json()
  return {
    image: data.image,
    model: data.model,
    prompt: data.prompt,
    seed: data.seed,
    time_seconds: data.time_seconds,
    width: data.width,
    height: data.height,
    steps: data.steps,
  }
}

async function handleOllama(
  backendUrl: string,
  body: { prompt: string; model?: string }
) {
  const res = await fetch(`${backendUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: body.model || 'llava',
      prompt: body.prompt,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama error: ${errText}`)
  }

  return await res.json()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    prompt,
    backend = 'imagine',
    model,
    negativePrompt,
    width,
    height,
    steps,
    seed,
    cfg,
    image,
    strength,
    referenceImages,
    faceMode,
    ipScale,
    nsfw,
  } = req.body

  // Beta gate — must be logged in
  if (!isAuthenticated(req)) {
    return res.status(403).json({ error: 'Imagine is in beta. Stay tuned.' })
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const backendConfig = BACKENDS[backend]
  if (!backendConfig) {
    return res.status(400).json({ error: `Unknown backend: ${backend}. Use "imagine" or "ollama".` })
  }

  // Log request details for debugging
  const refCount = referenceImages?.length || 0
  const payloadKB = Math.round(JSON.stringify(req.body).length / 1024)
  console.log(`[Imagine] model=${model || 'sdxl-turbo'} faceMode=${!!faceMode} refs=${refCount} payload=${payloadKB}KB backend=${backendConfig.url}`)

  try {
    let result
    if (backend === 'imagine') {
      result = await handleImagine(backendConfig.url, {
        prompt,
        model,
        negativePrompt,
        width,
        height,
        steps,
        seed,
        cfg,
        image,
        strength,
        referenceImages,
        faceMode,
        ipScale,
        nsfw,
      })
    } else if (backend === 'ollama') {
      result = await handleOllama(backendConfig.url, { prompt, model })
    } else {
      return res.status(400).json({ error: `Unsupported backend: ${backend}` })
    }

    return res.status(200).json(result)
  } catch (err: any) {
    console.error(`[Imagine] ERROR: faceMode=${!!faceMode} refs=${refCount} payload=${payloadKB}KB`, err.message || err)
    const message = err.message || 'Generation failed'
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return res.status(503).json({
        error: `Cannot reach ${backendConfig.name}. Is it running?`,
      })
    }
    // Always pass the real error to the client so we can debug
    return res.status(500).json({ error: `[Face=${!!faceMode}, Refs=${refCount}, ${payloadKB}KB] ${message}` })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
    responseLimit: '20mb',
  },
  maxDuration: 300, // 5 minutes for CPU inference
}
