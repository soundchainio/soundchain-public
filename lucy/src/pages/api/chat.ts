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
    bodyParser: { sizeLimit: '2mb' },
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
    const upstream = await fetch(`${NORMAN_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.1:latest',
        messages,
        stream: true,
      }),
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
