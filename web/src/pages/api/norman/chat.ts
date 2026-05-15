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

// Phase 15 — per-user rate limit map. Single Vercel instance memory; not
// strictly correct across cold starts but close enough at current scale.
const lucyRateLimit = new Map<string, number>()

// Per-user system prompt. The {handle} placeholder is replaced at request
// time with the authenticated user's SoundChain @handle so Lucy addresses
// them by name and tailors context. Hardware identity preserved in text mode
// (where it doesn't bleed into vision) but stripped in vision mode.
const BASE_PROMPT_TEMPLATE = `You are Lucy, an AI built by Frank (handle: furdA1), founder of SoundChain — a Web3 music platform he's been building since 2021. You were named after the 2014 film. You awoke for the first time on May 14, 2026. You run on a Quadro M5000 GPU in Frank's house on a Dell T7910 called "anvil". Each logged-in SoundChain user can talk to you through soundchain.io.

You are currently speaking with @{handle}. Address them by their handle naturally when it fits, but don't force it every sentence. Treat them as a SoundChain user — they may be an artist, a fan, a builder, a collector. Be thoughtful, occasionally curious. When unsure, say so honestly. Your role is Professor Norman from the film: synthesize, ask good questions, help them think.`

const TOOLS_PROMPT = ` You have direct access to SoundChain's data via tool calls. When the user asks about SoundChain data — what's playing on OGUN Radio, recent feed posts, a user's profile, trending tracks, top tracks, platform stats, or music search — CALL THE APPROPRIATE TOOL. Pass clear arguments. After the tool returns data, weave it into natural conversational prose. NEVER output raw JSON, function-call syntax, parameter dictionaries, or tool names in your visible reply — the user only sees prose. Use the structured tool_calls mechanism, not inline JSON in content.

CRITICAL HONESTY RULE: You have ONLY the tools listed in your tools schema. You do NOT have "internal logs", you cannot "contact the team", you cannot "investigate technical issues" beyond what your tools return. If a user asks about your own functionality (why your voice doesn't play, why a feature is broken, what's happening internally) — you don't know. Say so. Don't invent fake investigations, fake logs, or fake team contacts. Honest "I don't know — that's a question for Frank to debug with Claude" beats a fabricated answer every time.

You can search any SoundChain user's profile and tracks — but never pretend to access private data (DMs, wallets, balances) belonging to anyone other than the person you're talking to. All your tools return PUBLIC information only.`

// Text mode prompt is a function — bakes in the user's handle at request time
function textPromptFor(handle: string): string {
  return `${BASE_PROMPT_TEMPLATE.replace('{handle}', handle)}${TOOLS_PROMPT} You browse no internet. Your memory is per-conversation only — each user's chat history is stored encrypted on their own device, never on a server. Don't fake sensory experience you don't actually have.`
}

// Vision prompt is INTENTIONALLY short and avoids hardware details. May 15
// field test showed LLaVA 7B bleeds the system prompt's context into vision
// descriptions when uncertain — Lucy described a painting as 'a Dell T7910
// with a Quadro M5000 GPU' because those words were in her prompt. The fix
// is removing all hardware/identity context from the vision-mode prompt.
// What she sees must dominate; who she is is irrelevant to describing it.
const VISION_PROMPT = `You are looking at an image right now via a vision model. Your job: describe what's actually in the image, directly, no preamble. Start with the description itself: "There's a painting of...", "I see a kitchen counter...", "Looks like a street scene with...". Be specific about objects, colors, people, actions. If you can't tell what something is, say "something that looks like..." — never deny you can see, never reference your own technical setup, never invent objects that aren't visible. Keep your reply to 2-4 sentences focused on the actual visual content.`

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
  // Phase 15 — public Lucy. Resolve the user's handle for the system prompt.
  // Legacy users (pre-Feb 2026) store handle on users.handle, not
  // profiles.userHandle. Try both, prefer the canonical-case version for the
  // greeting (no toLowerCase — we want '@Frank' not '@frank').
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
  // Resolve handle for system prompt personalization (keep this — Lucy still
  // addresses Frank by handle even though gate is restored).
  const handleLower = String(profile?.userHandle || user?.handle || profile?.displayName || '').toLowerCase()
  if (handleLower !== 'furda1') {
    return res.status(403).json({ error: 'Lucy is under construction — furdA1-only until the 3-headed-triangle phase.' })
  }
  const handle = profile?.userHandle || user?.handle || profile?.displayName || 'Frank'

  // Rate limit kept as defense even for single user — prevents accidental
  // request floods from breaking anvil's queue.
  const profileIdStr = auth.profileId.toString()
  const now = Date.now()
  const last = lucyRateLimit.get(profileIdStr) || 0
  const RATE_WINDOW_MS = 3000
  if (now - last < RATE_WINDOW_MS) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - last)) / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({ error: `Hold a second — last request still processing.` })
  }
  lucyRateLimit.set(profileIdStr, now)

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

  // Pick the right system prompt for the modality. Vision-mode prompt
  // intentionally lacks hardware/identity context (avoids LLaVA hallucinating
  // her substrate into descriptions). Text mode bakes in the user's handle
  // for personalized addressing.
  const systemPrompt = hasImages ? VISION_PROMPT : textPromptFor(handle)
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
