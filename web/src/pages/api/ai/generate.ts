import type { NextApiRequest, NextApiResponse } from 'next'

// Beta whitelist — only these handles can generate (Phase 1)
const BETA_HANDLES = ['furdA1']

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

async function getBetaUser(req: NextApiRequest): Promise<string | null> {
  const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  if (!jwt) return null
  try {
    const meRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ query: '{ me { id handle } }' }),
    })
    if (!meRes.ok) return null
    const data = await meRes.json()
    return data?.data?.me?.handle || null
  } catch {
    return null
  }
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
  } = req.body

  // Beta gate — only whitelisted handles
  const handle = await getBetaUser(req)
  if (!handle || !BETA_HANDLES.includes(handle)) {
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
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: '20mb',
  },
  maxDuration: 300, // 5 minutes for CPU inference
}
