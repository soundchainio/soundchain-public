/**
 * Agent SMS — Send Endpoint
 * POST /api/agent/sms/send
 * Actions: REGISTER (save phone), SEND (dispatch SMS via configured provider)
 * Provider-agnostic: Twilio, AWS SNS, Vonage, Plivo, Meta — or local queue.
 * Powered by OGUN.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// ─── Enums ───────────────────────────────────────────────────────────

const ACTION = {
  REGISTER: 'REGISTER',
  SEND: 'SEND',
} as const

const VERDICT = {
  REGISTERED: 'REGISTERED',
  SENT: 'SENT',
  QUEUED: 'QUEUED',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const

const PROVIDER = {
  TWILIO: 'TWILIO',
  AWS_SNS: 'AWS_SNS',
  VONAGE: 'VONAGE',
  PLIVO: 'PLIVO',
  META: 'META',
  LOCAL_QUEUE: 'LOCAL_QUEUE',
} as const

// ─── Global Stores ───────────────────────────────────────────────────

interface Registration {
  phoneNumber: string
  registeredAt: number
  provider: string
}

interface SmsLogEntry {
  id: string
  phoneNumber: string
  content: string
  kind: string
  agentSource: string
  priority: string
  provider: string
  verdict: string
  timestamp: number
}

interface RateEntry {
  count: number
  windowStart: number
}

const registrations: Map<string, Registration> =
  (global as any).__smsRegistrations || new Map()
if (!(global as any).__smsRegistrations) {
  ;(global as any).__smsRegistrations = registrations
}

const messageLog: SmsLogEntry[] = (global as any).__smsMessageLog || []
if (!(global as any).__smsMessageLog) {
  ;(global as any).__smsMessageLog = messageLog
}

const rateLimits: Map<string, RateEntry> =
  (global as any).__smsRateLimits || new Map()
if (!(global as any).__smsRateLimits) {
  ;(global as any).__smsRateLimits = rateLimits
}

// ─── Provider Detection ─────────────────────────────────────────────

function detectProvider(): string {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return PROVIDER.TWILIO
  if (process.env.AWS_SNS_REGION) return PROVIDER.AWS_SNS
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) return PROVIDER.VONAGE
  if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) return PROVIDER.PLIVO
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) return PROVIDER.META
  return PROVIDER.LOCAL_QUEUE
}

// ─── Rate Limiter ────────────────────────────────────────────────────
// Max 10 SMS per minute per phone number

function checkRateLimit(phone: string): string {
  const now = Date.now()
  const entry = rateLimits.get(phone)

  if (!entry || now - entry.windowStart > 60_000) {
    rateLimits.set(phone, { count: 1, windowStart: now })
    return 'ALLOWED'
  }

  if (entry.count >= 10) return 'BLOCKED'

  entry.count++
  return 'ALLOWED'
}

// ─── Provider Dispatch ───────────────────────────────────────────────

async function sendViaTwilio(phone: string, content: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) return VERDICT.QUEUED

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const params = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: content,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (response.ok) return VERDICT.SENT
  return VERDICT.PROVIDER_ERROR
}

async function sendViaVonage(phone: string, content: string): Promise<string> {
  const apiKey = process.env.VONAGE_API_KEY
  const apiSecret = process.env.VONAGE_API_SECRET
  const fromNumber = process.env.VONAGE_FROM_NUMBER || 'SoundChain'

  if (!apiKey || !apiSecret) return VERDICT.QUEUED

  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      to: phone.replace('+', ''),
      from: fromNumber,
      text: content,
    }),
  })

  if (response.ok) {
    const data = await response.json()
    if (data.messages?.[0]?.status === '0') return VERDICT.SENT
  }
  return VERDICT.PROVIDER_ERROR
}

async function sendViaPlivo(phone: string, content: string): Promise<string> {
  const authId = process.env.PLIVO_AUTH_ID
  const authToken = process.env.PLIVO_AUTH_TOKEN
  const fromNumber = process.env.PLIVO_FROM_NUMBER

  if (!authId || !authToken || !fromNumber) return VERDICT.QUEUED

  const response = await fetch(`https://api.plivo.com/v1/Account/${authId}/Message/`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${authId}:${authToken}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      src: fromNumber,
      dst: phone.replace('+', ''),
      text: content,
    }),
  })

  if (response.ok) return VERDICT.SENT
  return VERDICT.PROVIDER_ERROR
}

// ─── Handler ─────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, phoneNumber, message } = req.body

  if (!action || !phoneNumber) {
    return res.status(400).json({ verdict: VERDICT.REJECTED, reason: 'Missing action or phoneNumber' })
  }

  const cleanPhone = String(phoneNumber).replace(/[^0-9+]/g, '')
  if (cleanPhone.length < 10) {
    return res.status(400).json({ verdict: VERDICT.REJECTED, reason: 'Invalid phone number' })
  }

  // ─── REGISTER ────────────────────────────────────────────────────
  if (action === ACTION.REGISTER) {
    const provider = detectProvider()
    registrations.set(cleanPhone, {
      phoneNumber: cleanPhone,
      registeredAt: Date.now(),
      provider,
    })
    return res.status(200).json({
      verdict: VERDICT.REGISTERED,
      provider,
      timestamp: Date.now(),
    })
  }

  // ─── SEND ────────────────────────────────────────────────────────
  if (action === ACTION.SEND) {
    if (!message?.content) {
      return res.status(400).json({ verdict: VERDICT.REJECTED, reason: 'Missing message content' })
    }

    // Rate limit
    const rateCheck = checkRateLimit(cleanPhone)
    if (rateCheck === 'BLOCKED') {
      return res.status(429).json({ verdict: VERDICT.RATE_LIMITED })
    }

    const provider = detectProvider()
    let verdict = VERDICT.QUEUED

    // Dispatch to provider
    try {
      if (provider === PROVIDER.TWILIO) {
        verdict = await sendViaTwilio(cleanPhone, message.content)
      } else if (provider === PROVIDER.VONAGE) {
        verdict = await sendViaVonage(cleanPhone, message.content)
      } else if (provider === PROVIDER.PLIVO) {
        verdict = await sendViaPlivo(cleanPhone, message.content)
      }
      // AWS_SNS, META, LOCAL_QUEUE → stay QUEUED (not yet implemented)
    } catch {
      verdict = VERDICT.PROVIDER_ERROR
    }

    // Log
    const entry: SmsLogEntry = {
      id: 'sms_' + Math.random().toString(36).slice(2, 10),
      phoneNumber: cleanPhone,
      content: message.content.slice(0, 160),
      kind: message.kind || 'SYSTEM',
      agentSource: message.agentSource || 'ADMIN',
      priority: message.priority || 'NORMAL',
      provider,
      verdict,
      timestamp: Date.now(),
    }
    messageLog.unshift(entry)
    if (messageLog.length > 500) messageLog.length = 500

    return res.status(200).json({
      verdict,
      id: entry.id,
      provider,
      timestamp: Date.now(),
    })
  }

  return res.status(400).json({ verdict: VERDICT.REJECTED, reason: 'Unknown action' })
}
