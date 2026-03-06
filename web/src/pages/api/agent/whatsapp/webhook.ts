/**
 * Agent WHATSAPP — Webhook Endpoint
 * GET  /api/agent/whatsapp/webhook — Meta webhook verification (challenge)
 * POST /api/agent/whatsapp/webhook — Receive incoming messages from WhatsApp
 *
 * Meta sends message events here. We parse and store for agent processing.
 * Incoming messages can trigger agent actions (e.g., user replies "bugs" → EYE responds).
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'soundchain_whatsapp_verify_2026'

const INBOUND_KIND = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  REACTION: 'REACTION',
  UNKNOWN: 'UNKNOWN',
} as const

// Global inbound message store
const inboundMessages: any[] = (global as any).__waInbound || []
if (!(global as any).__waInbound) {
  ;(global as any).__waInbound = inboundMessages
}

// Command routing — user can text commands from WhatsApp
const COMMAND_MAP: Record<string, { agent: string; description: string }> = {
  'bugs': { agent: 'EYE', description: 'List recent bugs' },
  'status': { agent: 'MANAGER', description: 'Suite status' },
  'market': { agent: 'MARKO', description: 'Market scan' },
  'ogun': { agent: 'MARKO', description: 'OGUN price' },
  'wall': { agent: 'WALL', description: 'Recent wall posts' },
  'help': { agent: 'ADMIN', description: 'List commands' },
  'search': { agent: 'FORGE', description: 'Search source code' },
  'recap': { agent: 'ADMIN', description: 'Daily recap' },
}

function parseCommand(text: string): { command: string; args: string } | null {
  const trimmed = text.trim().toLowerCase()
  const parts = trimmed.split(/\s+/)
  const cmd = parts[0]
  if (COMMAND_MAP[cmd]) {
    return { command: cmd, args: parts.slice(1).join(' ') }
  }
  return null
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ─── GET: Webhook verification (Meta challenge) ──────────────
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge)
    }

    return res.status(403).json({ error: 'Verification failed' })
  }

  // ─── POST: Incoming messages ─────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body

  // Meta sends entry → changes → value → messages
  try {
    const entries = body?.entry || []

    for (const entry of entries) {
      const changes = entry?.changes || []

      for (const change of changes) {
        const value = change?.value
        if (!value) continue

        const messages = value.messages || []
        const contacts = value.contacts || []

        for (const msg of messages) {
          const contact = contacts.find((c: any) => c.wa_id === msg.from) || {}

          let kind = INBOUND_KIND.UNKNOWN
          let content = ''

          if (msg.type === 'text') {
            kind = INBOUND_KIND.TEXT
            content = msg.text?.body || ''
          } else if (msg.type === 'image') {
            kind = INBOUND_KIND.IMAGE
            content = msg.image?.caption || '[Image]'
          } else if (msg.type === 'audio') {
            kind = INBOUND_KIND.AUDIO
            content = '[Audio message]'
          } else if (msg.type === 'video') {
            kind = INBOUND_KIND.VIDEO
            content = msg.video?.caption || '[Video]'
          } else if (msg.type === 'reaction') {
            kind = INBOUND_KIND.REACTION
            content = msg.reaction?.emoji || ''
          }

          // Parse for commands
          const parsedCommand = kind === INBOUND_KIND.TEXT ? parseCommand(content) : null

          const inbound = {
            id: 'wi_' + Math.random().toString(36).slice(2, 10),
            waMessageId: msg.id,
            from: msg.from,
            contactName: contact.profile?.name || 'Unknown',
            kind,
            content: content.slice(0, 4096),
            command: parsedCommand,
            timestamp: Number(msg.timestamp) * 1000 || Date.now(),
            receivedAt: Date.now(),
          }

          inboundMessages.push(inbound)
          while (inboundMessages.length > 500) inboundMessages.shift()
        }
      }
    }
  } catch {
    // Meta expects 200 even on parse errors (avoids retry storms)
  }

  // Always respond 200 to Meta
  return res.status(200).json({ status: 'received' })
}
