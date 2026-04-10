/**
 * Managed Agent Registry — List & Info Endpoint
 * GET /api/agent/managed/agents
 * GET /api/agent/managed/agents?handle=smith
 *
 * Returns the full agent registry or details for a specific agent.
 * Shows: name, handle, model, role, description, available tools.
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { AGENT_REGISTRY, getAgentDefinition, getAllAgentHandles } from 'lib/managed-agents'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ verdict: 'REJECTED', reason: 'GET only' })
  }

  const handle = req.query.handle as string | undefined

  // Single agent detail
  if (handle) {
    const def = getAgentDefinition(handle)
    if (!def) {
      return res.status(404).json({
        verdict: 'NOT_FOUND',
        reason: `Agent "${handle}" not found`,
        available: getAllAgentHandles(),
      })
    }

    return res.status(200).json({
      verdict: 'FOUND',
      agent: {
        name: def.name,
        handle: def.handle,
        model: def.model,
        role: def.role,
        description: def.description,
        customTools: def.customTools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        builtinToolsEnabled: def.builtinToolsEnabled,
        systemPromptPreview: def.system.slice(0, 200) + '...',
      },
    })
  }

  // Full registry
  const agents = Object.entries(AGENT_REGISTRY).map(([h, def]) => ({
    name: def.name,
    handle: h,
    model: def.model,
    role: def.role,
    description: def.description,
    toolCount: def.customTools.length + def.builtinToolsEnabled.length,
  }))

  return res.status(200).json({
    verdict: 'LISTED',
    count: agents.length,
    agents,
    apiVersion: 'managed-agents-2026-04-01',
  })
}
