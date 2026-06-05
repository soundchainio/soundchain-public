import type { NextApiRequest, NextApiResponse } from 'next'

function isAuthenticated(req: NextApiRequest): boolean {
  const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  return !!jwt && jwt.length > 10
}

const IMAGINE_SERVER_URL = process.env.IMAGINE_SERVER_URL || 'http://localhost:8190'

// Async submit: Wan 2.2 i2v clips take minutes (over Vercel's 300s cap), so this just
// SUBMITS the job and returns a job_id. The client polls /api/ai/animate/status.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!isAuthenticated(req)) {
    return res.status(403).json({ error: 'Animate is in beta. Stay tuned.' })
  }

  const { image, prompt, steps, seed, target_duration, nsfw, face_mode, reference_images } = req.body
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required (base64)' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 50_000)
  try {
    const r = await fetch(`${IMAGINE_SERVER_URL}/api/animate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        prompt: prompt || '',
        steps: steps || 20,
        seed: seed ?? -1,
        target_duration: target_duration || 4,
        nsfw: nsfw || false,
        face_mode: face_mode || false,
        reference_images: reference_images || [],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { error: text.slice(0, 200) } }
    if (!r.ok || !data.job_id) {
      return res.status(r.status >= 500 ? 503 : r.status).json({ error: data.detail || data.error || 'Failed to start animation' })
    }
    return res.status(200).json(data) // { job_id, seed, width, height, length, fps }
  } catch (err: any) {
    clearTimeout(timeout)
    const msg = err.name === 'AbortError' ? 'Animate server did not respond' : (err.message || 'Failed to start animation')
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return res.status(503).json({ error: 'Cannot reach Imagine Server. Is it running?' })
    }
    return res.status(500).json({ error: msg })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
  },
  maxDuration: 60,
}
