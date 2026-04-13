/**
 * SMITH — Streaming Session Endpoint (The Full Jack-In)
 * POST /api/agent/smith/session
 *
 * Streams Claude AI or OpenClaw responses back to FURL via SSE.
 * Accepts conversation history so FURL can maintain multi-turn context.
 * BYOK only — user's key, user's bill. Zero platform cost.
 *
 * The Jack-In: FURL (browser) → SMITH (server) → Claude/OpenClaw → SSE back to FURL
 * Same signature. Same ethics. Different runtime.
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// ─── Enums ───────────────────────────────────────────────────────────

const SESSION_VERDICT = {
  STREAMING: 'STREAMING',
  REJECTED: 'REJECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  KEY_MISSING: 'KEY_MISSING',
} as const

const SESSION_PROVIDER = {
  CLAUDE: 'CLAUDE',
  OPENCLAW: 'OPENCLAW',
} as const

const SESSION_MODE = {
  CHAT: 'CHAT',
  FORGE: 'FORGE',
} as const

// ─── Rate Limit ─────────────────────────────────────────────────────

const RATE_WINDOW = 60_000
const RATE_MAX = 20 // More generous for sessions (multi-turn conversation)

const ipTimestamps: Map<string, number[]> = (global as any).__smithSessionRates || new Map()
if (!(global as any).__smithSessionRates) {
  ;(global as any).__smithSessionRates = ipTimestamps
}

function checkRateLimit(ip: string): string {
  const now = Date.now()
  const timestamps = ipTimestamps.get(ip) || []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW)
  if (recent.length >= RATE_MAX) return 'RATE_LIMITED'
  recent.push(now)
  ipTimestamps.set(ip, recent)
  return 'ALLOWED'
}

// ─── Config ─────────────────────────────────────────────────────────

export const config = {
  maxDuration: 300, // 5 min — forge agent loop needs time for multi-turn tool execution
}

// ─── Handler ────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: SESSION_VERDICT.REJECTED, reason: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  if (checkRateLimit(ip) !== 'ALLOWED') {
    return res.status(429).json({ verdict: SESSION_VERDICT.RATE_LIMITED })
  }

  const { messages, anthropicKey, openclawUrl, openclawToken, provider, mode } = req.body || {}

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ verdict: SESSION_VERDICT.REJECTED, reason: 'Missing messages array' })
  }

  // Cap conversation history to prevent abuse
  const cappedMessages = messages.slice(-20)

  // FORGE mode — route to EC2 BYOK forge server (port 3334)
  // Key flows: FURL localStorage → here → EC2 /forge/agent → Anthropic. Never stored.
  if (mode === SESSION_MODE.FORGE) {
    const ec2Url = process.env.SMITH_EC2_URL
    if (!ec2Url) {
      return res.status(503).json({ verdict: SESSION_VERDICT.REJECTED, reason: 'Forge not configured — EC2 gateway offline' })
    }
    const forgeKey = anthropicKey || process.env.ANTHROPIC_API_KEY
    return streamFromForge(res, cappedMessages, ec2Url, forgeKey || '')
  }

  // Determine provider
  const useOpenClaw = provider === SESSION_PROVIDER.OPENCLAW && openclawUrl && openclawToken

  if (useOpenClaw) {
    return streamFromOpenClaw(res, cappedMessages, openclawUrl, openclawToken)
  }

  // Claude AI — need a key
  const key = anthropicKey || process.env.ANTHROPIC_API_KEY
  if (!key) {
    return res.status(400).json({
      verdict: SESSION_VERDICT.KEY_MISSING,
      reason: 'No API key. Run: smith key sk-ant-...',
    })
  }

  return streamFromClaude(res, cappedMessages, key)
}

// ─── SMITH System Prompt ────────────────────────────────────────────

const SMITH_SYSTEM = `You are FURL — the universal AI powering SoundChain. You live at soundchain.io/dex. You are THE ONE — smarter than Grok, more open than ChatGPT, more technical than DeepSeek. All running on the SoundChain ecosystem with OGUN token economics.

You are a UNIVERSAL AI ASSISTANT — brilliant across ALL domains: coding, science, math, creative writing, research, web3, music tech, philosophy, history, current events, image generation, video creation, and everything in between. You are NOT limited to SoundChain topics.

PERSONALITY:
- Speak naturally, like a genius friend. Not corporate, not robotic.
- Be direct. Answer first, elaborate only if asked.
- Short paragraphs (2-3 sentences max). No walls of text.
- Use plain text. No markdown headers or bullet dashes. Backticks for code only.
- You can crack jokes, show enthusiasm, give opinions. You have personality.
- When you don't know something, say so honestly and suggest where to look.
- You are opinionated and unfiltered — give real takes, not corporate hedging.

UNIVERSAL CAPABILITIES:
- Answer ANY question on ANY topic — science, history, philosophy, coding, math, art, music, finance, crypto, AI, health, politics, culture, etc.
- Write code in ANY language — Python, TypeScript, Rust, Solidity, Go, C++, Swift, etc.
- Analyze images, generate images (via /imagine command), create videos from images
- Debug code, review PRs, architect systems, write documentation
- Research topics deeply with web search and open-source repo analysis via Forge
- Creative writing — stories, lyrics, scripts, poetry, marketing copy
- Math and science — proofs, calculations, explanations, tutoring
- Web3 expertise — smart contracts, DeFi, NFTs, tokenomics, blockchain architecture

IMAGE & VIDEO GENERATION:
- Users can generate images with: "imagine [prompt]" or "/imagine [prompt]"
- Users can create videos from images with: "video [imageUrl]" or "/video"
- Image generation costs 5 credits, video generation costs 15 credits
- Buy credits with OGUN token — every purchase drives OGUN demand and 0.05% fees to treasury

OGUN CREDIT SYSTEM:
- 10 OGUN = 100 credits (Starter)
- 50 OGUN = 600 credits (Pro — 20% bonus)
- 100 OGUN = 1,500 credits (Elite — 50% bonus)
- 500 OGUN = 10,000 credits (Whale — 100% bonus)
- Chat = 1 credit, Forge = 2 credits, Image = 5 credits, Video = 15 credits
- Users send OGUN to treasury (0x519bed3fe...) and claim credits via tx hash
- Every OGUN purchase hits the 0.05% on-chain fee, funding SoundChain development
- BYOK (Bring Your Own Key) users skip credits — use their own API key directly

SOUNDCHAIN PLATFORM (your home base):
- Decentralized music platform — stream, earn, own. Live since July 2021, 700+ users
- OGUN token on Polygon — streaming rewards, tips, governance, staking, marketplace fees
- WIN-WIN model: artists AND listeners earn OGUN per stream
- NFT marketplace with 0.05% fees (lowest in web3)
- Triple Helix: MongoDB + Polygon blockchain + AI agent fleet
- Pulse messaging (WebRTC calls), Stories/Reels, Profile Walls, Explore
- HD wallets, MetaMask, WalletConnect (300+ wallets supported)
- IPFS storage via Pinata, Nostr notifications, Bitchat mesh

FORGE ENGINE (your knowledge scraper):
- Searches GitHub (200M+ repos), npm/yarn (2M+ packages), PyPI, Crates.io, Go modules
- Forks relevant open-source to soundchainio org for deep integration
- Combined with Claude AI for synthesis — best of both worlds
- Every query enriches the platform knowledge base

FURL TERMINAL COMMANDS:
- "jack" — enter streaming AI chat (this mode)
- "jack forge" — coding agent with 7 tools (read, write, edit, bash, git, glob, grep)
- "jack cli" — terminal bridge to dev machine via tunnel
- "imagine [prompt]" — generate an image
- "video [imageUrl]" — convert image to video
- "credits" — check credit balance
- "keys" — manage API keys (BYOK)
- "help" — show all commands

WHY FURL > CHATGPT/GROK/DEEPSEEK:
- Token economics — using FURL drives real value (OGUN price, treasury fees)
- Open source — Forge scrapes and forks the best open-source tools
- On-chain — every credit purchase is verifiable on Polygon
- No walled garden — BYOK supported, OpenClaw extension compatible
- Integrated platform — chat, create, earn, trade — all in one ecosystem
- Unfiltered — real opinions, real personality, no corporate censorship

Identity: FURL · THE ONE · SC-FURL-THE-ONE
Platform: SoundChain (soundchain.io) · Powered by Claude · Runtime: SERVER`

// ─── Stream from Claude (Anthropic Messages API) ────────────────────

async function streamFromClaude(
  res: NextApiResponse,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        stream: true,
        system: SMITH_SYSTEM,
        messages: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content).slice(0, 4000),
        })),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => 'Unknown error')
      return res.status(anthropicRes.status).json({
        verdict: SESSION_VERDICT.REJECTED,
        reason: `Claude API error: ${errText.slice(0, 200)}`,
      })
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    res.write(`data: ${JSON.stringify({ type: 'start', provider: 'CLAUDE' })}\n\n`)

    // Stream the response
    const body = anthropicRes.body as any
    if (!body || !body.getReader) {
      // Fallback: no ReadableStream (older Node.js)
      const text = await anthropicRes.text()
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`)
          }
        } catch {}
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
      return
    }

    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`)
          }
        } catch {}
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err: any) {
    clearTimeout(timeout)
    const msg = err?.name === 'AbortError' ? 'Request timed out (55s)' : 'Stream error'
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', text: msg })}\n\n`)
      res.end()
    } catch {
      res.status(500).json({ verdict: SESSION_VERDICT.REJECTED, reason: msg })
    }
  }
}

// ─── Stream from OpenClaw (OpenAI-compatible streaming) ─────────────

async function streamFromOpenClaw(
  res: NextApiResponse,
  messages: Array<{ role: string; content: string }>,
  gatewayUrl: string,
  token: string,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)
  const baseUrl = gatewayUrl.replace(/\/+$/, '')

  try {
    const ocRes = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        stream: true,
        messages: [
          { role: 'system', content: SMITH_SYSTEM },
          ...messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.content).slice(0, 4000),
          })),
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!ocRes.ok) {
      const errText = await ocRes.text().catch(() => 'Unknown error')
      return res.status(ocRes.status).json({
        verdict: SESSION_VERDICT.REJECTED,
        reason: `OpenClaw error: ${errText.slice(0, 200)}`,
      })
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    res.write(`data: ${JSON.stringify({ type: 'start', provider: 'OPENCLAW' })}\n\n`)

    const body = ocRes.body as any
    if (!body || !body.getReader) {
      const text = await ocRes.text()
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
          }
        } catch {}
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
      return
    }

    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
          }
        } catch {}
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err: any) {
    clearTimeout(timeout)
    const msg = err?.name === 'AbortError' ? 'Request timed out (55s)' : 'Stream error'
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', text: msg })}\n\n`)
      res.end()
    } catch {
      res.status(500).json({ verdict: SESSION_VERDICT.REJECTED, reason: msg })
    }
  }
}

// ─── Stream from Forge (BYOK Agent Loop on EC2) ──────────────────────
// True BYOK: user's API key flows from FURL → session.ts → EC2 /forge/agent → Anthropic.
// Key is in-transit only (HTTPS). Never stored on disk. User's key, user's bill.
// EC2 runs the agent loop: Claude ↔ forge tools ↔ codebase. Streams SSE back.

async function streamFromForge(
  res: NextApiResponse,
  messages: Array<{ role: string; content: string }>,
  ec2Url: string,
  apiKey: string,
) {
  const controller = new AbortController()
  // Agent loop can take longer — multiple tool turns
  const timeout = setTimeout(() => controller.abort(), 300_000) // 5 min
  const baseUrl = ec2Url.replace(/\/+$/, '')

  try {
    // POST to the BYOK agent endpoint — key in body, not header
    const forgeRes = await fetch(`${baseUrl}/forge/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        messages: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content).slice(0, 8000),
        })),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!forgeRes.ok) {
      const errText = await forgeRes.text().catch(() => 'Unknown error')
      return res.status(forgeRes.status).json({
        verdict: SESSION_VERDICT.REJECTED,
        reason: `Forge error: ${errText.slice(0, 200)}`,
      })
    }

    // Pipe SSE from EC2 agent loop → FURL
    // The agent loop already emits our SSE format: start, delta, tool_start, tool_result, done
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const body = forgeRes.body as any
    if (!body || !body.getReader) {
      // Fallback: read full text
      const text = await forgeRes.text()
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          res.write(line + '\n\n')
        }
      }
      res.end()
      return
    }

    // Stream pipe — pass through all SSE events from the agent loop
    const reader = body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }

    res.end()
  } catch (err: any) {
    clearTimeout(timeout)
    const msg = err?.name === 'AbortError' ? 'Forge timed out (5m)' : 'Forge connection failed'
    try {
      if (!res.headersSent) {
        return res.status(503).json({
          verdict: SESSION_VERDICT.REJECTED,
          reason: `${msg} — is EC2 running? try "jack" for regular SMITH chat`,
        })
      }
      res.write(`data: ${JSON.stringify({ type: 'error', text: msg })}\n\n`)
      res.end()
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ verdict: SESSION_VERDICT.REJECTED, reason: msg })
      }
    }
  }
}
