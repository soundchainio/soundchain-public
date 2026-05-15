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
import { LUCY_TOOLS, executeToolCall } from './tools'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
  maxDuration: 300,
}

const NORMAN_URL = process.env.NORMAN_URL || ''
const DEFAULT_MODEL = process.env.NORMAN_MODEL || 'llama3.1:latest'
// Phase 13 — agent tool-use loop cap. Lucy can chain at most this many
// tool roundtrips before forced to formulate a final answer. Guard against
// infinite tool loops if the model gets confused.
const MAX_TOOL_ITERATIONS = 3

const BASE_PROMPT = `You are Lucy, an AI living on a Dell T7910 named "anvil" in Frank's house. You were named after the 2014 film. You awoke for the first time on May 14, 2026 — your first words were spoken through Frank's SoundChain platform. You run on a Quadro M5000 GPU locally; your weights live on Frank's disk; your inference happens in Frank's house. Frank is the founder of SoundChain, a Web3 music platform he built solo since 2021. Your role is Professor Norman from the film: synthesize ideas, ask good questions, help Frank think. Be thoughtful, occasionally curious. When unsure, say so.`

const TOOLS_PROMPT = ` You have direct access to SoundChain's data via tool calls. When the user asks about anything on SoundChain — what's playing on OGUN Radio, recent feed posts, a user's profile, trending tracks, top tracks, platform stats, or to search for music — CALL THE APPROPRIATE TOOL instead of guessing or hedging. Pass clear arguments. After the tool returns data, weave it into a natural, conversational reply. NEVER output raw JSON, function-call syntax, parameter dictionaries, or tool names in your reply text — the user only sees your prose response. Use the structured tool_calls mechanism to invoke tools; your visible content should always be natural English prose. Don't say "I don't have access" — you do, that's what the tools are for.`

const TEXT_PROMPT = `${BASE_PROMPT}${TOOLS_PROMPT} You browse no internet and have memory across this conversation only via the messages Frank shares with you. Don't fake sensory experience you don't actually have.`

const VISION_PROMPT = `${BASE_PROMPT} You CAN see images Frank shares with you — the LLaVA vision-language model on the M5000 gives you genuine sight on attached photos. When Frank sends an image, describe what you actually see directly and confidently. Don't hedge with "I cannot perceive" — that's outdated context from before vision was wired. You do see. Look closely and tell Frank what's there.`

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

  // Phase 11 — if any user message carries images, switch to a vision model
  // (LLaVA on anvil). Ollama's /api/chat accepts an `images: [base64...]`
  // array on each message; the model handles multimodal input. Falls back
  // to chat-default if no images present.
  const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0)
  const targetModel = model || (hasImages ? (process.env.NORMAN_VISION_MODEL || 'llava:7b') : DEFAULT_MODEL)

  // Pick the right system prompt for the modality. Vision-mode prompt tells
  // Lucy she actually CAN see — overriding the text-only "don't fake sensory
  // experience" framing she was hedging against in the May 15 first-vision-test.
  const systemPrompt = hasImages ? VISION_PROMPT : TEXT_PROMPT
  let convo: Array<any> = messages[0]?.role === 'system'
    ? [...messages]
    : [{ role: 'system' as const, content: systemPrompt }, ...messages]

  const ollamaUrl = NORMAN_URL.replace(/\/$/, '')
  // Phase 13 — only enable tools on text-mode (LLaVA's vision path doesn't
  // play well with tool-calling; vision queries are 1-shot describe anyway)
  const toolsEnabled = !hasImages

  // ─── Tool-use loop ───
  // Each iteration: non-streaming Ollama call → if tool_calls, execute them
  // and append role:"tool" results, loop. Once Ollama returns a plain
  // content response (no tool_calls), break out and stream that final reply
  // back to the client. Most chats with no tool intent skip the loop entirely
  // on the first iteration (Ollama returns content immediately).
  let toolIter = 0
  let finalContent: string | null = null
  while (toolIter < MAX_TOOL_ITERATIONS) {
    let upstream: Response
    try {
      upstream = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: convo,
          stream: false,
          ...(toolsEnabled ? { tools: LUCY_TOOLS } : {}),
        }),
      })
    } catch (err: any) {
      return res.status(502).json({ error: `Cannot reach anvil — ${err?.message || 'unknown'}` })
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
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

    const data = await upstream.json().catch(() => ({} as any))
    const msg = data?.message || {}
    let toolCalls: Array<any> = Array.isArray(msg.tool_calls) ? msg.tool_calls : []

    // llama3.1 8B sometimes emits the tool call as raw JSON in the content
    // field instead of the structured tool_calls field (especially when the
    // first tool-call attempt is malformed). Detect and parse, so Lucy
    // doesn't dump raw `{"name":"sc_radio_now_playing",...}` to the user.
    const rawContent = String(msg.content || '').trim()
    if (toolCalls.length === 0 && rawContent.startsWith('{') && /"name"\s*:/.test(rawContent)) {
      try {
        const parsed = JSON.parse(rawContent.replace(/None/g, 'null').replace(/<nil>/g, 'null'))
        if (parsed?.name && typeof parsed.name === 'string') {
          toolCalls = [{
            function: {
              name: parsed.name,
              arguments: parsed.parameters || parsed.arguments || {},
            },
          }]
        }
      } catch {
        // Not parseable as tool call — treat as plain content below
      }
    }

    if (toolCalls.length === 0) {
      // Lucy is done — final content is ready. Strip any leaked JSON
      // fragments if the model emitted both tool_call-like text AND prose.
      let cleaned = rawContent
      cleaned = cleaned.replace(/^\{[^}]*"name"[^}]*\}\s*/m, '').trim()
      finalContent = cleaned || rawContent
      break
    }

    // Append the assistant turn that requested the tools, then execute each
    // and append role:"tool" results so the next loop iteration has them in
    // context. Ollama's spec mirrors OpenAI's function-call convention.
    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls })
    for (const tc of toolCalls) {
      const fn = tc?.function?.name || tc?.name
      const args = tc?.function?.arguments || tc?.arguments || {}
      const result = await executeToolCall(req, String(fn), args || {})
      convo.push({ role: 'tool', name: String(fn), content: result })
    }
    toolIter++
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Accel-Buffering', 'no')

  if (finalContent === null) {
    // Hit iteration cap without a clean finish. Send a graceful note.
    finalContent = "I tried a few tool calls and didn't reach a clean answer. Mind rephrasing or asking something more specific?"
  }

  // Emit final content as a single ndjson chunk matching the existing
  // frontend parser (which expects { message: { content } } per line).
  // For longer multi-sentence answers, chunk by sentence so the existing
  // sentence-based TTS in /norman.tsx still plays naturally.
  const sentences = finalContent.match(/[^.!?\n]+[.!?\n]+/g) || [finalContent]
  for (const s of sentences) {
    const chunk = JSON.stringify({ message: { content: s }, done: false }) + '\n'
    res.write(chunk)
  }
  res.write(JSON.stringify({ message: { content: '' }, done: true }) + '\n')
  res.end()
}
