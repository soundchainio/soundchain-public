/**
 * Managed Agent Session — SSE Streaming Endpoint
 * POST /api/agent/managed/session
 *
 * Creates a managed agent session on Anthropic and streams events back via SSE.
 * The agent runs autonomously in Anthropic's cloud — executing built-in tools
 * (bash, file I/O, web search) — and calls back for custom tools (MongoDB,
 * OGUN contracts, IPFS).
 *
 * BYOK: User's key → user's bill. Platform key as fallback.
 *
 * Request body:
 *   {
 *     agent: "smith" | "furl" | "agent_explore" | ... (handle from registry)
 *     messages: [{ role: "user", content: "..." }]
 *     anthropicKey?: "sk-ant-..." (BYOK)
 *   }
 *
 * Response: SSE stream with events:
 *   { type: "start", provider: "MANAGED_AGENT", agent: "smith" }
 *   { type: "delta", text: "..." }
 *   { type: "tool_start", tool: "soundchain_query" }
 *   { type: "tool_result", tool: "soundchain_query", success: "YES" }
 *   { type: "done" }
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { streamManagedSession, getAgentDefinition, getAllAgentHandles } from 'lib/managed-agents'
import { MEMORY_BACKEND, type MemoryBackend, type MemoryRow } from 'lib/managed-agents/types'
import { authFromRequest } from 'lib/api/authJwt'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

// ─── Rate Limit ──────────────────────────────────────────────────

const RATE_WINDOW = 60_000
const RATE_MAX = 15

const ipTimestamps: Map<string, number[]> = (global as any).__managedSessionRates || new Map()
if (!(global as any).__managedSessionRates) {
  ;(global as any).__managedSessionRates = ipTimestamps
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

// ─── Config ──────────────────────────────────────────────────────

export const config = {
  maxDuration: 300, // 5 min — managed agents can run multi-turn tool loops
}

// ─── Handler ─────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: 'REJECTED', reason: 'POST only' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  if (checkRateLimit(ip) !== 'ALLOWED') {
    return res.status(429).json({ verdict: 'RATE_LIMITED' })
  }

  const { agent, messages, anthropicKey, localMemory } = req.body || {}

  // Validate agent handle
  if (!agent || typeof agent !== 'string') {
    return res.status(400).json({
      verdict: 'REJECTED',
      reason: `Missing agent handle. Available: ${getAllAgentHandles().join(', ')}`,
    })
  }

  const def = getAgentDefinition(agent)
  if (!def) {
    return res.status(400).json({
      verdict: 'REJECTED',
      reason: `Unknown agent: "${agent}". Available: ${getAllAgentHandles().join(', ')}`,
    })
  }

  // Validate messages
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ verdict: 'REJECTED', reason: 'Missing messages array' })
  }

  // Cap conversation history
  const cappedMessages = messages.slice(-20)

  // Resolve viewer identity for per-user agent memory.
  // Anonymous callers get a working session but no persistent diary.
  const auth = await authFromRequest(req)
  const userId = auth?.userId

  // Resolve the user's memory backend preference.
  // Default LOCAL_DEVICE for new users (their device is the source of truth for their diary).
  // LOCAL_DEVICE activates ONLY when the client also sends a `localMemory` array —
  // this signals client-side support. If the client doesn't signal yet, we fall back
  // to CLOUD_MONGO transparently so existing clients keep working.
  let backend: MemoryBackend = MEMORY_BACKEND.CLOUD_MONGO
  let clientLocalMemory: MemoryRow[] | undefined
  if (userId) {
    try {
      const client = await clientPromise
      const db = client.db('soundchain')
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { memoryBackend: 1 } },
      )
      const pref = (user?.memoryBackend as MemoryBackend) || MEMORY_BACKEND.LOCAL_DEVICE
      if (pref === MEMORY_BACKEND.LOCAL_DEVICE && Array.isArray(localMemory)) {
        backend = MEMORY_BACKEND.LOCAL_DEVICE
        clientLocalMemory = (localMemory as MemoryRow[]).slice(0, 500) // cap at 500 rows
      } else if (pref === MEMORY_BACKEND.NOSTR || pref === MEMORY_BACKEND.BYOM) {
        // Reserved backends fall back to cloud until their plumbing ships.
        backend = MEMORY_BACKEND.CLOUD_MONGO
      } else if (pref === MEMORY_BACKEND.CLOUD_MONGO) {
        backend = MEMORY_BACKEND.CLOUD_MONGO
      }
      // else LOCAL_DEVICE pref without localMemory array → silent fallback to CLOUD_MONGO
    } catch {
      // If backend resolution fails, default to cloud — never break the session.
      backend = MEMORY_BACKEND.CLOUD_MONGO
    }
  }

  // Stream the managed session
  return streamManagedSession(res, agent, cappedMessages, anthropicKey, userId, backend, clientLocalMemory)
}
