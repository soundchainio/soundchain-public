/**
 * Agent WHATSAPP — Send / Register Endpoint
 * POST /api/agent/whatsapp/send
 *
 * Actions:
 *   REGISTER — register phone number for WhatsApp notifications
 *   SEND — send a message via WhatsApp Cloud API
 *
 * Uses Meta WhatsApp Cloud API. First 1,000 conversations/month FREE.
 * Requires WHATSAPP_TOKEN and WHATSAPP_PHONE_ID env vars.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const WHATSAPP_API = 'https://graph.facebook.com/v21.0'

const ACTION = {
  REGISTER: 'REGISTER',
  SEND: 'SEND',
} as const

const VERDICT = {
  SENT: 'SENT',
  REGISTERED: 'REGISTERED',
  QUEUED: 'QUEUED',
  FAILED: 'FAILED',
  MISSING_CONFIG: 'MISSING_CONFIG',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
} as const

// Global registrations + message log
const registrations: Map<string, { phoneNumber: string; registeredAt: number }> =
  (global as any).__waRegistrations || new Map()
if (!(global as any).__waRegistrations) {
  ;(global as any).__waRegistrations = registrations
}

const messageLog: any[] = (global as any).__waMessageLog || []
if (!(global as any).__waMessageLog) {
  ;(global as any).__waMessageLog = messageLog
}

// Rate limiter: max 20 messages per minute per phone
const rateLimits: Map<string, number[]> = (global as any).__waRateLimits || new Map()
if (!(global as any).__waRateLimits) {
  ;(global as any).__waRateLimits = rateLimits
}

function checkRateLimit(phone: string): string {
  const now = Date.now()
  const window = 60_000 // 1 minute
  const maxMessages = 20

  const timestamps = rateLimits.get(phone) || []
  const recent = timestamps.filter((t) => now - t < window)

  if (recent.length >= maxMessages) return VERDICT.RATE_LIMITED

  recent.push(now)
  rateLimits.set(phone, recent)
  return VERDICT.SENT
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, phoneNumber, message } = req.body

  if (!action || !phoneNumber) {
    return res.status(400).json({ verdict: VERDICT.REJECTED, error: 'Missing action or phoneNumber' })
  }

  // ─── REGISTER ────────────────────────────────────────────────
  if (action === ACTION.REGISTER) {
    registrations.set(phoneNumber, {
      phoneNumber,
      registeredAt: Date.now(),
    })

    return res.status(200).json({
      verdict: VERDICT.REGISTERED,
      phoneNumber,
      timestamp: Date.now(),
    })
  }

  // ─── SEND ────────────────────────────────────────────────────
  if (action === ACTION.SEND) {
    if (!message || !message.content) {
      return res.status(400).json({ verdict: VERDICT.REJECTED, error: 'Missing message content' })
    }

    // Rate limit check
    const rateCheck = checkRateLimit(phoneNumber)
    if (rateCheck === VERDICT.RATE_LIMITED) {
      return res.status(429).json({ verdict: VERDICT.RATE_LIMITED })
    }

    const token = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID

    // Log the message regardless of API config
    const logEntry = {
      id: 'wm_' + Math.random().toString(36).slice(2, 10),
      phoneNumber,
      kind: message.kind || 'SYSTEM',
      agentSource: message.agentSource || 'MANAGER',
      content: String(message.content).slice(0, 4096),
      template: message.template || null,
      metadata: message.metadata || {},
      timestamp: Date.now(),
      sent: 'PENDING',
    }

    // If WhatsApp Cloud API is configured, send via Meta
    if (token && phoneId) {
      try {
        // Format phone for WhatsApp (strip + prefix, ensure country code)
        const waPhone = phoneNumber.replace(/^\+/, '')

        // Build message body with agent prefix
        const agentPrefix = message.agentSource ? `[${message.agentSource}] ` : ''
        const body = `${agentPrefix}${message.content}`

        const response = await fetch(`${WHATSAPP_API}/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waPhone,
            type: 'text',
            text: { body },
          }),
        })

        const data = await response.json()

        if (response.ok) {
          logEntry.sent = 'SENT'
          messageLog.push(logEntry)
          while (messageLog.length > 500) messageLog.shift()

          return res.status(200).json({
            verdict: VERDICT.SENT,
            messageId: data.messages?.[0]?.id || logEntry.id,
            timestamp: Date.now(),
          })
        }

        // API error — queue for retry
        logEntry.sent = 'FAILED'
        messageLog.push(logEntry)
        while (messageLog.length > 500) messageLog.shift()

        return res.status(200).json({
          verdict: VERDICT.FAILED,
          error: data.error?.message || 'WhatsApp API error',
          timestamp: Date.now(),
        })
      } catch {
        logEntry.sent = 'FAILED'
        messageLog.push(logEntry)
        while (messageLog.length > 500) messageLog.shift()

        return res.status(200).json({
          verdict: VERDICT.FAILED,
          error: 'Network error',
          timestamp: Date.now(),
        })
      }
    }

    // No WhatsApp API configured — queue locally
    logEntry.sent = 'QUEUED'
    messageLog.push(logEntry)
    while (messageLog.length > 500) messageLog.shift()

    return res.status(200).json({
      verdict: VERDICT.QUEUED,
      note: 'WHATSAPP_TOKEN and WHATSAPP_PHONE_ID not configured. Message queued locally.',
      id: logEntry.id,
      timestamp: Date.now(),
    })
  }

  return res.status(400).json({ verdict: VERDICT.REJECTED, error: `Unknown action: ${action}` })
}
