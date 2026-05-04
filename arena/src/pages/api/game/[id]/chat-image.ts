/**
 * Chat image upload — pins to Pinata IPFS, returns the gateway URL.
 *
 * Edge runtime so we get native FormData parsing without pulling in formidable
 * or hand-rolling a multipart parser. Mirrors web/'s Pinata pin pattern.
 *
 * Per-device rate limited (1 upload per 10s, in-memory per isolate). Falls
 * back to descriptive 5xx if Pinata is unreachable so the chat still works
 * for text-only messages even when uploads are down.
 */

export const config = {
  runtime: 'edge',
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const UPLOAD_COOLDOWN_MS = 10_000

// Per-isolate rate limiter. Bursts hitting different isolates are bounded
// upstream by Vercel concurrency; this stops the easy single-tab spam case.
const lastUploadByDevice = new Map<string, number>()
function rateLimited(deviceId: string): boolean {
  const now = Date.now()
  const last = lastUploadByDevice.get(deviceId) || 0
  if (now - last < UPLOAD_COOLDOWN_MS) return true
  lastUploadByDevice.set(deviceId, now)
  if (lastUploadByDevice.size > 1000) {
    const cutoff = now - UPLOAD_COOLDOWN_MS * 2
    for (const [k, v] of lastUploadByDevice) {
      if (v < cutoff) lastUploadByDevice.delete(k)
    }
  }
  return false
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405, headers: { Allow: 'POST' } })
  }

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (!apiKey || !apiSecret) {
    return json({ error: 'Image upload not configured' }, 503)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Invalid upload' }, 400)
  }

  const file = form.get('file')
  const deviceId = String(form.get('deviceId') || '')

  if (!(file instanceof File)) return json({ error: 'Missing file' }, 400)
  if (!deviceId || deviceId.length < 8) return json({ error: 'Missing device id' }, 400)
  if (file.size > MAX_BYTES) return json({ error: 'Image must be 5 MB or smaller' }, 413)
  if (!ALLOWED_MIMES.has(file.type)) {
    return json({ error: 'Use JPG, PNG, WEBP, or GIF' }, 415)
  }
  if (rateLimited(deviceId)) {
    return json({ error: 'Wait a few seconds before uploading another image' }, 429)
  }

  // Pin to Pinata. Fresh FormData (Pinata expects a `file` part).
  const pinForm = new FormData()
  pinForm.append('file', file, file.name || 'arena-chat.jpg')
  pinForm.append('pinataMetadata', JSON.stringify({ name: `arena-chat-${Date.now()}` }))
  pinForm.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  let cid: string | null = null
  try {
    const pinResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: pinForm,
    })
    if (!pinResp.ok) {
      return json({ error: 'Image pinning failed — try again' }, 502)
    }
    const j = await pinResp.json()
    cid = j.IpfsHash || null
  } catch {
    return json({ error: 'Image upload service unavailable' }, 502)
  }

  if (!cid) return json({ error: 'Image pinning returned no CID' }, 502)

  return json({ mediaUrl: `https://soundchain.mypinata.cloud/ipfs/${cid}` }, 200)
}
