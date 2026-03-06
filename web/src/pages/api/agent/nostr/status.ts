/**
 * Agent NOSTR — Status Endpoint
 * GET  /api/agent/nostr/status — Relay health, publish stats, identity info
 * POST /api/agent/nostr/status — Receive client heartbeat
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://relay.primal.net',
]

// Global state
const clientState: any = (global as any).__nostrClientState || {
  lastHeartbeat: 0,
  connectedRelays: [],
  totalEventsSent: 0,
  totalEventsReceived: 0,
  hasIdentity: 'NO',
}
if (!(global as any).__nostrClientState) {
  ;(global as any).__nostrClientState = clientState
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST — client heartbeat
  if (req.method === 'POST') {
    const body = req.body
    if (body.connectedRelays) clientState.connectedRelays = body.connectedRelays
    if (body.totalEventsSent) clientState.totalEventsSent = body.totalEventsSent
    if (body.totalEventsReceived) clientState.totalEventsReceived = body.totalEventsReceived
    if (body.hasIdentity) clientState.hasIdentity = body.hasIdentity
    clientState.lastHeartbeat = Date.now()
    return res.status(200).json({ verdict: 'ACKNOWLEDGED' })
  }

  // GET — full status
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const publishLog: any[] = (global as any).__nostrPublishLog || []

  // Compute relay success rates
  const relayStats: Record<string, { attempts: number; successes: number }> = {}
  for (const url of DEFAULT_RELAYS) {
    relayStats[url] = { attempts: 0, successes: 0 }
  }

  const hasPrivateKey = process.env.SOUNDCHAIN_NOSTR_PRIVATE_KEY ? 'YES' : 'NO'

  return res.status(200).json({
    agent: 'NOSTR',
    version: '1.0.0',
    description: 'Decentralized messaging & relay network — NIP-17 DMs, location chat, agent alerts. FREE FOREVER.',
    mode: clientState.connectedRelays.length > 0 ? 'CONNECTED' : 'DISCONNECTED',
    serverSigningKey: hasPrivateKey,
    defaultRelays: DEFAULT_RELAYS,
    clientState: {
      connectedRelays: clientState.connectedRelays,
      totalEventsSent: clientState.totalEventsSent,
      totalEventsReceived: clientState.totalEventsReceived,
      hasIdentity: clientState.hasIdentity,
      lastHeartbeat: clientState.lastHeartbeat,
    },
    publishStats: {
      totalPublished: publishLog.length,
      recentEvents: publishLog.slice(-10).reverse().map((e) => ({
        id: e.id,
        kind: e.kind,
        contentPreview: e.contentPreview,
        relaysSuccess: e.relaysSuccess,
        timestamp: e.timestamp,
      })),
    },
    protocols: [
      'NIP-01 — Basic protocol flow',
      'NIP-04 — Legacy encrypted DMs',
      'NIP-17 — Gift-wrapped encrypted DMs (preferred)',
      'NIP-44 — Versioned encryption',
      'NIP-59 — Gift wrapping',
      'NIP-07 — Browser extension signing (nos2x, Alby)',
    ],
    capabilities: [
      'Text notes (kind 1)',
      'NIP-17 encrypted DMs (kind 1059 gift wrap)',
      'Location-based chat via geohash (kind 20000)',
      'Agent alerts (kind 30078)',
      'NIP-07 browser extension support',
      'Auto-reconnect to relays',
      'Per-agent alert routing (ENABLED / DISABLED / URGENT_ONLY)',
    ],
    cost: 'FREE FOREVER — No API keys. No rate limits. No corporate dependency.',
    interop: [
      'Bitchat (iOS) — Bluetooth mesh + Nostr',
      'Damus (iOS) — Full Nostr client',
      'Primal (iOS/Android/Web) — Nostr + Bitcoin',
      'Amethyst (Android) — Full Nostr client',
      'Snort (Web) — Lightweight Nostr web client',
    ],
    timestamp: Date.now(),
  })
}
