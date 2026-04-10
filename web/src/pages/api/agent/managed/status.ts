/**
 * Managed Agent Status — Health & Cache Endpoint
 * GET /api/agent/managed/status
 *
 * Shows:
 * - All cached managed agents (created on Anthropic)
 * - Active session count
 * - API key status (BYOK vs platform)
 * - Tool handler health
 *
 * POST /api/agent/managed/status { action: "clear_cache" }
 * - Clears agent cache (forces re-creation on next session)
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { getCachedAgents, clearAgentCache, getAllAgentHandles, KEY_SOURCE } from 'lib/managed-agents'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST: Admin actions
  if (req.method === 'POST') {
    const { action } = req.body || {}

    if (action === 'clear_cache') {
      const before = getCachedAgents().length
      clearAgentCache()
      return res.status(200).json({
        verdict: 'CLEARED',
        message: `Cleared ${before} cached agent(s). Next session will re-create agents on Anthropic.`,
      })
    }

    return res.status(400).json({ verdict: 'REJECTED', reason: 'Unknown action. Available: clear_cache' })
  }

  // GET: Status report
  if (req.method !== 'GET') {
    return res.status(405).json({ verdict: 'REJECTED', reason: 'GET or POST only' })
  }

  const cached = getCachedAgents()
  const allHandles = getAllAgentHandles()

  const keyStatus = process.env.ANTHROPIC_API_KEY
    ? KEY_SOURCE.PLATFORM
    : KEY_SOURCE.NONE

  return res.status(200).json({
    verdict: 'OPERATIONAL',
    identity: {
      system: 'SoundChain Managed Agents',
      apiVersion: 'managed-agents-2026-04-01',
      sdk: '@anthropic-ai/sdk',
    },
    agents: {
      registered: allHandles.length,
      cached: cached.length,
      handles: allHandles,
      cachedDetails: cached.map((a) => ({
        handle: a.handle,
        agentId: a.agentId,
        version: a.version,
        environmentId: a.environmentId,
        createdAt: new Date(a.createdAt).toISOString(),
        ageMinutes: Math.round((Date.now() - a.createdAt) / 60000),
      })),
    },
    keys: {
      platformKey: keyStatus,
      byokSupported: 'YES',
    },
    tools: {
      custom: [
        'soundchain_query',
        'ogun_contract_read',
        'ipfs_query',
        'radio_now_playing',
        'platform_stats',
        'feed_post',
      ],
      builtin: ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'web_fetch', 'web_search'],
    },
    endpoints: {
      session: 'POST /api/agent/managed/session',
      agents: 'GET /api/agent/managed/agents',
      status: 'GET /api/agent/managed/status',
    },
    timestamp: new Date().toISOString(),
  })
}
