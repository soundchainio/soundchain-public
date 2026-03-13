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
  }
) {
  const res = await fetch(`${backendUrl}/api/generate`, {
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
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `Imagine server error: ${res.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.detail || errMsg
    } catch {
      errMsg = errText || errMsg
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
      })
    } else if (backend === 'ollama') {
      result = await handleOllama(backendConfig.url, { prompt, model })
    } else {
      return res.status(400).json({ error: `Unsupported backend: ${backend}` })
    }

    return res.status(200).json(result)
  } catch (err: any) {
    console.error('AI Generate error:', err)
    const message = err.message || 'Generation failed'
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return res.status(503).json({
        error: `Cannot reach ${backendConfig.name}. Is it running?`,
      })
    }
    return res.status(500).json({ error: message })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
    responseLimit: '20mb',
  },
  maxDuration: 300, // 5 minutes for CPU inference
}
