/**
 * Agent SMS — Status Endpoint
 * GET  /api/agent/sms/status — Provider info, message stats, route configs
 * POST /api/agent/sms/status — Client heartbeat
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// Global state
const clientState: any = (global as any).__smsClientState || {
  lastHeartbeat: 0,
  mode: 'IDLE',
  provider: 'LOCAL_QUEUE',
  messagesSent: 0,
  messagesFailed: 0,
}
if (!(global as any).__smsClientState) {
  ;(global as any).__smsClientState = clientState
}

// Detect which provider is configured
function detectProvider(): string {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return 'TWILIO'
  if (process.env.AWS_SNS_REGION) return 'AWS_SNS'
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) return 'VONAGE'
  if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) return 'PLIVO'
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) return 'META'
  return 'LOCAL_QUEUE'
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST — client heartbeat
  if (req.method === 'POST') {
    const body = req.body
    if (body.mode) clientState.mode = body.mode
    if (body.provider) clientState.provider = body.provider
    if (body.messagesSent) clientState.messagesSent = body.messagesSent
    if (body.messagesFailed) clientState.messagesFailed = body.messagesFailed
    clientState.lastHeartbeat = Date.now()
    return res.status(200).json({ verdict: 'ACKNOWLEDGED' })
  }

  // GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const messageLog: any[] = (global as any).__smsMessageLog || []
  const registrations: Map<string, any> = (global as any).__smsRegistrations || new Map()
  const provider = detectProvider()

  // Cost per provider
  const costEstimates: Record<string, string> = {
    TWILIO: '$0.0079/SMS',
    AWS_SNS: '$0.00645/SMS',
    VONAGE: '$0.0068/SMS',
    PLIVO: '$0.0050/SMS',
    META: '$0.0050/SMS (via WhatsApp)',
    LOCAL_QUEUE: 'QUEUED (no provider configured)',
  }

  return res.status(200).json({
    agent: 'SMS',
    version: '1.0.0',
    description: 'Provider-agnostic SMS gateway — Twilio, AWS SNS, Vonage, Plivo, Meta. Last-resort channel.',
    activeProvider: provider,
    costEstimate: costEstimates[provider] || 'UNKNOWN',
    registeredPhones: registrations.size,
    clientState: {
      mode: clientState.mode,
      messagesSent: clientState.messagesSent,
      messagesFailed: clientState.messagesFailed,
      lastHeartbeat: clientState.lastHeartbeat,
    },
    messageStats: {
      totalMessages: messageLog.length,
      recentMessages: messageLog.slice(0, 10).map((m) => ({
        id: m.id,
        kind: m.kind,
        agentSource: m.agentSource,
        verdict: m.verdict,
        provider: m.provider,
        timestamp: m.timestamp,
      })),
    },
    supportedProviders: [
      { name: 'TWILIO', envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'], configured: provider === 'TWILIO' ? 'YES' : 'NO' },
      { name: 'AWS_SNS', envVars: ['AWS_SNS_REGION'], configured: provider === 'AWS_SNS' ? 'YES' : 'NO' },
      { name: 'VONAGE', envVars: ['VONAGE_API_KEY', 'VONAGE_API_SECRET', 'VONAGE_FROM_NUMBER'], configured: provider === 'VONAGE' ? 'YES' : 'NO' },
      { name: 'PLIVO', envVars: ['PLIVO_AUTH_ID', 'PLIVO_AUTH_TOKEN', 'PLIVO_FROM_NUMBER'], configured: provider === 'PLIVO' ? 'YES' : 'NO' },
      { name: 'META', envVars: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID'], configured: provider === 'META' ? 'YES' : 'NO' },
    ],
    capabilities: [
      'Provider-agnostic: swap backends without code changes',
      'Per-agent routing: ENABLED / DISABLED / URGENT_ONLY',
      'Daily budget caps (default $1/day)',
      'Per-agent daily send limits',
      'Rate limiting: 10 SMS/minute per phone',
      '160-char truncation with agent prefix',
      'Cost estimation per provider',
      'Auto-detect configured provider from env vars',
    ],
    cost: 'Varies by provider — $0.005-$0.008/SMS. Use Nostr/WhatsApp for free alternatives.',
    timestamp: Date.now(),
  })
}
