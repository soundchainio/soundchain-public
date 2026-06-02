/**
 * /api/chat — proxy to anvil's local-LLM stack via norman.soundchain.io.
 *
 * V1: zero-auth public chat. No persistence server-side — every conversation
 * lives in the browser's IndexedDB via useLucyMemory. Anvil endpoint runs
 * llama3.1 (or whatever model norman is currently routing to).
 *
 * Streaming response shape: newline-delimited JSON, one token chunk per line.
 * Frontend reads via ReadableStream + line-by-line parse.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const NORMAN_URL = process.env.NORMAN_URL || 'https://norman.soundchain.io'
const NORMAN_TIMEOUT_MS = 30000

export const config = {
  api: {
    bodyParser: { sizeLimit: '8mb' },  // headroom for attached images (downscaled client-side, but allow margin); 2mb caused "anvil 413"
    responseLimit: false,
  },
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, model } = (req.body || {}) as { messages?: ChatMessage[]; model?: string }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), NORMAN_TIMEOUT_MS)

  try {
    // IMPORTANT: do NOT default a model here. norman now points at the Lucy
    // orchestrator, which CLASSIFIES each turn (vision→llava, reason→phi4,
    // fast→llama3.1) — but only when no model is forced. Sending a model makes
    // the orchestrator treat it as "forced" and skip routing, so an attached
    // image would hit a text model instead of llava. Pass model ONLY if the
    // client explicitly set one (debug/override); otherwise let it route.
    const upstreamBody: { messages: ChatMessage[]; stream: boolean; model?: string } = {
      messages,
      stream: true,
    }
    if (model) upstreamBody.model = model
    const upstream = await fetch(`${NORMAN_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({
        error: 'norman upstream unreachable',
        status: upstream.status,
        statusText: upstream.statusText,
      })
    }

    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      res.write(chunk)
    }
    res.end()
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'norman timeout' })
    }
    return res.status(500).json({ error: err?.message || 'unknown error' })
  }
}
