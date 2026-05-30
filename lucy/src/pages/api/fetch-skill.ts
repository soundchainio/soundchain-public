/**
 * /api/fetch-skill?url=... — fallback fetcher for Lucy's URL skill ingestion.
 *
 * Lucy tries to fetch a skill.md DIRECTLY from the device first (decentralized,
 * on-device — works for CORS-open hosts like soundchain.io/skill.md). When the
 * target blocks cross-origin reads, the client falls back to this proxy.
 *
 * SSRF-guarded (no private/loopback hosts), text-only, size-capped. Returns the
 * raw markdown text; the client then runs it through the same sanitize → store
 * pipeline (a fetched skill is just as untrusted as a pasted one).
 *
 * Returns: { ok, text } | { ok:false, error }
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const TIMEOUT_MS = 8000
const MAX_BYTES = 200_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'GET only' })
  }
  const raw = (req.query.url as string || '').trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return res.status(400).json({ ok: false, error: 'http/https url required' })
  let host = ''
  try { host = new URL(raw).hostname } catch { return res.status(400).json({ ok: false, error: 'invalid url' }) }
  // Block private + loopback + link-local (SSRF).
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|localhost$|0\.0\.0\.0)/i.test(host)) {
    return res.status(400).json({ ok: false, error: 'blocked host' })
  }
  try {
    const r = await fetch(raw, {
      headers: { 'user-agent': 'lucy.soundchain.io/1.0 (+skill fetch)', accept: 'text/markdown,text/plain,text/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!r.ok) return res.status(200).json({ ok: false, error: `upstream ${r.status}` })
    const reader = r.body?.getReader()
    if (!reader) return res.status(200).json({ ok: false, error: 'no body' })
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) { received += value.length; chunks.push(value); if (received > MAX_BYTES) { try { reader.cancel() } catch {} ; break } }
    }
    const buf = new Uint8Array(received)
    let off = 0
    for (const c of chunks) { buf.set(c.subarray(0, Math.min(c.length, MAX_BYTES - off)), off); off += c.length; if (off >= MAX_BYTES) break }
    const text = new TextDecoder().decode(buf).slice(0, MAX_BYTES)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, text })
  } catch (err: any) {
    return res.status(200).json({ ok: false, error: err?.message || 'fetch failed' })
  }
}
