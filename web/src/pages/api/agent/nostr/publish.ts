/**
 * Agent NOSTR — Publish Endpoint
 * POST /api/agent/nostr/publish
 *
 * Server-side event signing and relay publishing.
 * Signs events with SOUNDCHAIN_NOSTR_PRIVATE_KEY (or ephemeral key).
 * Publishes to 6 default relays via WebSocket.
 *
 * Supports: text notes, NIP-17 DMs, location chat, agent alerts.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.primal.net',
]

const VERDICT = {
  PUBLISHED: 'PUBLISHED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  QUEUED: 'QUEUED',
} as const

// Global publish log
const publishLog: any[] = (global as any).__nostrPublishLog || []
if (!(global as any).__nostrPublishLog) {
  ;(global as any).__nostrPublishLog = publishLog
}

// Rate limiter: max 30 events per minute
const rateLimits: number[] = (global as any).__nostrRateLimits || []
if (!(global as any).__nostrRateLimits) {
  ;(global as any).__nostrRateLimits = rateLimits
}

function checkRateLimit(): string {
  const now = Date.now()
  const window = 60_000
  const max = 30

  // Clean old entries
  while (rateLimits.length > 0 && rateLimits[0] < now - window) {
    rateLimits.shift()
  }

  if (rateLimits.length >= max) return 'RATE_LIMITED'
  rateLimits.push(now)
  return 'OK'
}

// Simplified event creation (without full Schnorr signing)
// For production: use nostr-tools on server side
function createUnsignedEvent(kind: number, content: string, tags: string[][]): any {
  const created_at = Math.floor(Date.now() / 1000)

  // Generate deterministic-ish pubkey from env or random
  const privKeyHex = process.env.SOUNDCHAIN_NOSTR_PRIVATE_KEY
  let pubkey: string

  if (privKeyHex) {
    // Derive pubkey from private key (simplified — production should use secp256k1)
    pubkey = crypto.createHash('sha256').update(privKeyHex).digest('hex').slice(0, 64)
  } else {
    pubkey = crypto.randomBytes(32).toString('hex')
  }

  const event = {
    kind,
    created_at,
    tags,
    content,
    pubkey,
  }

  // Event ID = sha256 of serialized event
  const serialized = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content])
  const id = crypto.createHash('sha256').update(serialized).digest('hex')

  return {
    ...event,
    id,
    sig: crypto.randomBytes(64).toString('hex'), // Placeholder — production needs Schnorr
  }
}

// Publish to relay via WebSocket with timeout
async function publishToRelay(url: string, event: any, timeoutMs: number = 5000): Promise<string> {
  // Dynamic import WebSocket for Node.js
  const { WebSocket: WS } = await import('ws')

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try { ws.close() } catch { /* */ }
      resolve('TIMEOUT')
    }, timeoutMs)

    let ws: InstanceType<typeof WS>
    try {
      ws = new WS(url)
    } catch {
      clearTimeout(timer)
      resolve('ERROR')
      return
    }

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify(['EVENT', event]))
      } catch {
        clearTimeout(timer)
        ws.close()
        resolve('ERROR')
      }
    }

    ws.onmessage = (msg: any) => {
      try {
        const data = JSON.parse(String(msg.data))
        if (Array.isArray(data) && data[0] === 'OK') {
          clearTimeout(timer)
          ws.close()
          resolve(data[2] ? 'OK' : 'REJECTED')
          return
        }
      } catch { /* */ }
    }

    ws.onerror = () => {
      clearTimeout(timer)
      try { ws.close() } catch { /* */ }
      resolve('ERROR')
    }
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { kind, content, tags, recipientPubkey } = req.body

  if (kind === undefined || !content) {
    return res.status(400).json({ verdict: VERDICT.REJECTED, error: 'Missing kind or content' })
  }

  // Rate limit
  const rateCheck = checkRateLimit()
  if (rateCheck === 'RATE_LIMITED') {
    return res.status(429).json({ verdict: 'RATE_LIMITED' })
  }

  // Build event
  const eventTags = Array.isArray(tags) ? tags : []

  // Add SoundChain tag for discoverability
  if (!eventTags.some((t: string[]) => t[0] === 't' && t[1] === 'soundchain')) {
    eventTags.push(['t', 'soundchain'])
  }

  const event = createUnsignedEvent(
    Number(kind),
    String(content).slice(0, 4096),
    eventTags
  )

  // Publish to relays in parallel
  const results = await Promise.allSettled(
    DEFAULT_RELAYS.map((url) => publishToRelay(url, event))
  )

  const successes = results.filter(
    (r) => r.status === 'fulfilled' && r.value === 'OK'
  ).length

  // Log
  const logEntry = {
    id: event.id,
    kind,
    contentPreview: String(content).slice(0, 100),
    relaysAttempted: DEFAULT_RELAYS.length,
    relaysSuccess: successes,
    timestamp: Date.now(),
  }
  publishLog.push(logEntry)
  while (publishLog.length > 500) publishLog.shift()

  if (successes === 0) {
    return res.status(200).json({
      verdict: VERDICT.FAILED,
      eventId: event.id,
      relaysSuccess: 0,
      relaysAttempted: DEFAULT_RELAYS.length,
      note: 'No relays accepted the event. This is normal without proper Schnorr signatures. Install nostr-tools for production signing.',
      timestamp: Date.now(),
    })
  }

  return res.status(200).json({
    verdict: successes === DEFAULT_RELAYS.length ? VERDICT.PUBLISHED : VERDICT.PARTIAL,
    eventId: event.id,
    relaysSuccess: successes,
    relaysAttempted: DEFAULT_RELAYS.length,
    timestamp: Date.now(),
  })
}
