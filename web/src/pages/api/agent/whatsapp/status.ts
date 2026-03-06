/**
 * Agent WHATSAPP — Status Endpoint
 * GET /api/agent/whatsapp/status
 *
 * Returns connection status, message stats, registered phones,
 * inbound command log, and available commands.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const COMMAND_MAP: Record<string, string> = {
  'bugs': 'List recent bugs (EYE)',
  'status': 'Suite status (MANAGER)',
  'market': 'Market scan (MARKO)',
  'ogun': 'OGUN price (MARKO)',
  'wall': 'Recent wall posts',
  'help': 'List all commands',
  'search <query>': 'Search source code (FORGE)',
  'recap': 'Daily recap (ADMIN)',
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const registrations: Map<string, any> = (global as any).__waRegistrations || new Map()
  const messageLog: any[] = (global as any).__waMessageLog || []
  const inboundMessages: any[] = (global as any).__waInbound || []

  // Message stats
  const sent = messageLog.filter((m) => m.sent === 'SENT').length
  const queued = messageLog.filter((m) => m.sent === 'QUEUED').length
  const failed = messageLog.filter((m) => m.sent === 'FAILED').length

  // Agent source distribution
  const agentCounts: Record<string, number> = {}
  for (const msg of messageLog) {
    const agent = msg.agentSource || 'UNKNOWN'
    agentCounts[agent] = (agentCounts[agent] || 0) + 1
  }

  // Recent inbound commands
  const recentCommands = inboundMessages
    .filter((m: any) => m.command)
    .slice(-20)
    .reverse()
    .map((m: any) => ({
      command: m.command.command,
      args: m.command.args,
      from: m.from,
      timestamp: m.receivedAt,
    }))

  const hasApiConfig = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)

  return res.status(200).json({
    agent: 'WHATSAPP',
    version: '1.0.0',
    description: 'Real-time messaging bridge — syncs agents, Wall, Feed, DMs to WhatsApp',
    mode: hasApiConfig ? 'CONNECTED' : 'QUEUING',
    apiConfigured: hasApiConfig ? 'YES' : 'NO',
    registeredPhones: registrations.size,
    messageStats: {
      totalOutbound: messageLog.length,
      sent,
      queued,
      failed,
      totalInbound: inboundMessages.length,
      agentCounts,
    },
    recentCommands,
    availableCommands: COMMAND_MAP,
    syncCapabilities: [
      'Wall posts → WhatsApp notifications',
      'Wall replies → WhatsApp alerts',
      'DMs → WhatsApp forwarding',
      'Agent alerts → WhatsApp (per-agent routing)',
      'OGUN rewards → WhatsApp notifications',
      'Market alerts → WhatsApp (MARKO)',
      'Bug reports → WhatsApp (EYE)',
      'WhatsApp commands → Agent actions (bidirectional)',
    ],
    envVarsRequired: [
      'WHATSAPP_TOKEN — Meta Cloud API access token',
      'WHATSAPP_PHONE_ID — WhatsApp Business phone number ID',
      'WHATSAPP_VERIFY_TOKEN — Webhook verification token (default provided)',
    ],
    metaSetupUrl: 'https://developers.facebook.com/apps/',
    timestamp: Date.now(),
  })
}
