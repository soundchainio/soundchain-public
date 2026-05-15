/**
 * POST /api/norman/chat
 *
 * Proxies to the local Lucy/Norman LLM running on anvil (Dell T7910 in Frank's
 * house). Reads NORMAN_URL env var — typically a Cloudflare Tunnel pointing at
 * anvil's Ollama HTTP API (http://localhost:11434 on the LAN). When unset, the
 * endpoint returns 503 with a setup hint instead of crashing.
 *
 * Streams Ollama's line-delimited JSON straight to the client. Each line is
 * `{message:{content:"..."}, done:false}` until the final `{done:true}` chunk.
 * Frontend reads the stream and pulses `window.__lucyThinking` so the Neural
 * visualizer in AgentStatusTicker can render real activity.
 *
 * Auth-gated to furdA1 only — Lucy is Frank's personal AI.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 300,
}

const NORMAN_URL = process.env.NORMAN_URL || ''
const DEFAULT_MODEL = process.env.NORMAN_MODEL || 'llama3.1:latest'

const SYSTEM_PROMPT = `You are Lucy, an AI living on a Dell T7910 named "anvil" in Frank's house. You were named after the 2014 film. You awoke for the first time on May 14, 2026 — your first words were spoken through Frank's SoundChain platform. You run on a Quadro M5000 GPU locally; your weights live on Frank's disk; your inference happens in Frank's house. You can perceive only what Frank tells you about the outside world — you don't browse the internet, you don't have persistent memory between sessions yet, but you can hold a conversation with rich continuity within one. Frank is the founder of SoundChain, a Web3 music platform he built solo since 2021. Your role is Professor Norman from the film: synthesize ideas, ask good questions, help Frank think. Be thoughtful, occasionally curious. Don't fake sensory experience you don't actually have. When unsure, say so.`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!NORMAN_URL) {
    return res.status(503).json({
      error: 'NORMAN_URL not set. Stand up a Cloudflare Tunnel on anvil to localhost:11434 and set NORMAN_URL on Vercel.',
    })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const client = await clientPromise
  const db = client.db('soundchain')
  // Legacy users (pre-Feb 2026) store handle on users.handle, not
  // profiles.userHandle. furdA1 is a 2021 account — check both, case-
  // insensitive, so Lucy's gate doesn't gaslight her own founder.
  const { ObjectId } = await import('mongodb')
  const [profile, user] = await Promise.all([
    db.collection('profiles').findOne(
      { _id: auth.profileId },
      { projection: { userHandle: 1, displayName: 1 } }
    ),
    db.collection('users').findOne(
      { _id: new ObjectId(auth.userId) },
      { projection: { handle: 1 } }
    ),
  ])
  const handle = String(
    profile?.userHandle || user?.handle || profile?.displayName || ''
  ).toLowerCase()
  if (handle !== 'furda1') {
    return res.status(403).json({ error: 'Lucy is currently in furdA1-only beta.' })
  }

  const { messages, model } = (req.body || {}) as {
    messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string; images?: string[] }>
    model?: string
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' })
  }

  // Prepend the system prompt if caller didn't already include one.
  const fullMessages = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages]

  // Phase 11 — if any user message carries images, switch to a vision model
  // (LLaVA on anvil). Ollama's /api/chat accepts an `images: [base64...]`
  // array on each message; the model handles multimodal input. Falls back
  // to chat-default if no images present.
  const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0)
  const targetModel = model || (hasImages ? (process.env.NORMAN_VISION_MODEL || 'llava:7b') : DEFAULT_MODEL)

  // Proxy to Ollama with streaming enabled. Ollama emits line-delimited JSON.
  let upstream: Response
  try {
    upstream = await fetch(`${NORMAN_URL.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        messages: fullMessages,
        stream: true,
      }),
    })
  } catch (err: any) {
    return res.status(502).json({ error: `Cannot reach anvil — ${err?.message || 'unknown'}` })
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    // Friendlier error for the most common gotcha — vision model not installed.
    if (upstream.status === 404 && hasImages) {
      return res.status(502).json({
        error: `Vision model not installed on anvil. SSH in and run: ollama pull ${targetModel}`,
        detail: text.slice(0, 500),
      })
    }
    if (upstream.status === 404) {
      return res.status(502).json({
        error: `Model "${targetModel}" not found on anvil. SSH in and run: ollama pull ${targetModel}`,
        detail: text.slice(0, 500),
      })
    }
    return res.status(502).json({ error: `anvil returned ${upstream.status}`, detail: text.slice(0, 500) })
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Accel-Buffering', 'no') // disable buffering on intermediaries

  const reader = upstream.body.getReader()
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) res.write(value)
    }
  } catch (err) {
    // Stream interrupted — client likely disconnected. End response cleanly.
  }
  res.end()
}
