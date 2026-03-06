/**
 * Agent MANAGER — Suite Status Endpoint
 * GET: Returns all 14 agent statuses
 * POST: Receives heartbeat from client-side Manager
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const AGENT_NAMES = [
  'EYE', 'DESIGNER', 'SOCIAL', 'VIDEO', 'MUSIC',
  'ART', 'GAMER', 'ARCADE', 'MANAGER', 'ADMIN', 'MARKO', 'FORGE', 'WHATSAPP', 'NOSTR', 'SMS',
] as const

// Global suite state
const suiteState: any = (global as any).__agentSuiteState || {
  lastHeartbeat: 0,
  agents: AGENT_NAMES.map((name) => ({ name, status: 'IDLE', priority: 'NORMAL' })),
  activeCount: 0,
}
if (!(global as any).__agentSuiteState) {
  ;(global as any).__agentSuiteState = suiteState
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const body = req.body
    if (body.agents) suiteState.agents = body.agents
    if (body.activeCount) suiteState.activeCount = body.activeCount
    suiteState.lastHeartbeat = Date.now()
    return res.status(200).json({ verdict: 'ACKNOWLEDGED', timestamp: Date.now() })
  }

  // GET
  const bugStore: any[] = (global as any).__agentEyeBugStore || []

  return res.status(200).json({
    suite: 'SoundChain Agent Suite',
    version: '1.0.0',
    totalAgents: 15,
    agents: suiteState.agents,
    activeCount: suiteState.activeCount,
    lastHeartbeat: suiteState.lastHeartbeat,
    eyeBugCount: bugStore.length,
    timestamp: Date.now(),
  })
}
