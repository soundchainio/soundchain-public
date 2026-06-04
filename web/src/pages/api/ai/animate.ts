import type { NextApiRequest, NextApiResponse } from 'next'

function isAuthenticated(req: NextApiRequest): boolean {
  const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  return !!jwt && jwt.length > 10
}

const IMAGINE_SERVER_URL = process.env.IMAGINE_SERVER_URL || 'http://localhost:8190'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthenticated(req)) {
    return res.status(403).json({ error: 'Animate is in beta. Stay tuned.' })
  }

  const {
    image,
    prompt,
    num_frames,
    fps,
    steps,
    seed,
    motion_bucket_id,
    noise_aug_strength,
    decode_chunk_size,
    target_duration,
    reference_images,
    face_mode,
    ip_adapter_scale,
    nsfw,
  } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required (base64)' })
  }

  const refCount = reference_images?.length || 0
  const payloadKB = Math.round(JSON.stringify(req.body).length / 1024)
  console.log(`[Animate] steps=${steps || 25} faceMode=${!!face_mode} refs=${refCount} duration=${target_duration || 6}s payload=${payloadKB}KB`)

  // LTX on the RTX 5000 takes several minutes at high steps; allow ~9.5 min
  // (just under the EC2 relay's 600s nginx read timeout).
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 570_000)

  try {
    const backendRes = await fetch(`${IMAGINE_SERVER_URL}/api/animate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        prompt: prompt || '',
        num_frames: num_frames || 14,
        fps: fps || 7,
        steps: steps || 25,
        seed: seed ?? -1,
        motion_bucket_id: motion_bucket_id || 127,
        noise_aug_strength: noise_aug_strength ?? 0.02,
        decode_chunk_size: decode_chunk_size || 4,
        target_duration: target_duration || 6,
        reference_images: reference_images || [],
        face_mode: face_mode || false,
        ip_adapter_scale: ip_adapter_scale ?? 0.6,
        nsfw: nsfw || false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      let errMsg = `Imagine server error: ${backendRes.status}`
      try {
        const errJson = JSON.parse(errText)
        const d = errJson.detail
        // FastAPI validation errors return `detail` as an array of objects — stringify it so
        // the .toLowerCase() below never throws "n.toLowerCase is not a function".
        errMsg = typeof d === 'string' ? d : (d ? JSON.stringify(d) : errMsg)
      } catch {
        errMsg = errText || errMsg
      }
      if (errMsg.toLowerCase().includes('out of memory') || errMsg.toLowerCase().includes('oom')) {
        errMsg = `Server ran out of memory — try fewer frames or restart the server. (${errMsg})`
      }
      return res.status(backendRes.status >= 500 ? 503 : backendRes.status).json({ error: errMsg })
    }

    const data = await backendRes.json()
    return res.status(200).json(data)
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Animation timed out (~9 min). Lower Steps or shorten Duration — high steps on this GPU are slow.',
      })
    }
    const message = err.message || 'Animation failed'
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Cannot reach Imagine Server. Is it running?',
      })
    }
    console.error(`[Animate] ERROR: ${message}`)
    return res.status(500).json({ error: message })
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' },
    responseLimit: '50mb',
  },
  maxDuration: 800,
}
