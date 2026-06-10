/**
 * Custom avatar upload — pins to Pinata IPFS, returns the gateway URL.
 *
 * Same Edge-runtime + Pinata pattern as /api/game/[id]/chat-image. Smaller
 * size cap (2 MB) since avatars are tiny and don't need video. Per-device
 * rate-limited (1 upload per 30s) to stop avatar spam.
 *
 * Caller is HandlePickerModal — user picks a file, we pin, the returned URL
 * is stored in localStorage as the user's avatar AND posted to /api/handles/save
 * so it persists in the `arena_handles` collection. Render path in GameChat /
 * LiveTakesFeed detects URL vs emoji and swaps in <img>.
 */

export const config = {
  runtime: 'edge',
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const UPLOAD_COOLDOWN_MS = 30_000

const lastUploadByDevice = new Map<string, number>()
function isRateLimited(deviceId: string): boolean {
  const now = Date.now()
  const last = lastUploadByDevice.get(deviceId) || 0
  return now - last < UPLOAD_COOLDOWN_MS
}
function markUploadSuccess(deviceId: string): void {
  const now = Date.now()
  lastUploadByDevice.set(deviceId, now)
  if (lastUploadByDevice.size > 1000) {
    const cutoff = now - UPLOAD_COOLDOWN_MS * 2
    for (const [k, v] of lastUploadByDevice) {
      if (v < cutoff) lastUploadByDevice.delete(k)
    }
  }
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
    return json({ error: 'Avatar upload not configured' }, 503)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Invalid upload' }, 400)
  }

  // Self-hosted node `next start` returns multipart entries as Blob (not File),
  // so `instanceof File` wrongly rejected every upload ("Missing file"). Accept
  // any non-string entry — Blob has .size/.type/.arrayBuffer, all we need.
  const file = form.get('file') as File | Blob | null
  const deviceId = String(form.get('deviceId') || '')

  if (!file || typeof (file as any) === 'string') return json({ error: 'Missing file' }, 400)
  if (!deviceId || deviceId.length < 8) return json({ error: 'Missing device id' }, 400)
  if (file.size > MAX_BYTES) return json({ error: 'Avatar must be 2 MB or smaller' }, 413)
  if (!ALLOWED_MIMES.has(file.type)) {
    return json({ error: 'Use JPG, PNG, WEBP, or GIF' }, 415)
  }
  // Check rate limit BEFORE attempting the pin. Don't update the timestamp
  // until the pin succeeds — otherwise a failed Pinata call locks the user
  // out for 30s on a no-op (e.g. transient 502 from Pinata mid-upload).
  if (isRateLimited(deviceId)) {
    return json({ error: 'Wait 30 seconds before uploading another avatar' }, 429)
  }

  const pinForm = new FormData()
  pinForm.append('file', file, file.name || 'arena-avatar.jpg')
  pinForm.append('pinataMetadata', JSON.stringify({ name: `arena-avatar-${Date.now()}` }))
  pinForm.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  let cid: string | null = null
  try {
    const pinResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
      body: pinForm,
    })
    if (!pinResp.ok) {
      return json({ error: 'Avatar pinning failed — try again' }, 502)
    }
    const j = await pinResp.json()
    cid = j.IpfsHash || null
  } catch {
    return json({ error: 'Avatar upload service unavailable' }, 502)
  }

  if (!cid) return json({ error: 'Avatar pinning returned no CID' }, 502)

  // Pin succeeded — now mark the rate limit so the next upload from this
  // device is blocked for 30s. Failed pins do NOT consume the user's quota.
  markUploadSuccess(deviceId)

  return json({ avatarUrl: `https://soundchain.mypinata.cloud/ipfs/${cid}` }, 200)
}
