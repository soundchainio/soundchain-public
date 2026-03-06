/**
 * Agent Eye — Bug Listing Endpoint
 * GET /api/agent/eye/bugs
 *
 * Query params:
 *   severity - Filter by BUG_SEVERITY (CRITICAL, ERROR, WARNING, INFO)
 *   trigger  - Filter by TRIGGER_KIND (JS_ERROR, UNHANDLED_REJECTION, CONSOLE_ERROR, NETWORK_ERROR)
 *   id       - Get single bug by ID (full detail with action timeline)
 *   limit    - Max results (default 50)
 *
 * Zero booleans — filtering uses explicit === checks against enum values.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

const TRIGGER_KIND = {
  JS_ERROR: 'JS_ERROR',
  UNHANDLED_REJECTION: 'UNHANDLED_REJECTION',
  CONSOLE_ERROR: 'CONSOLE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

const TTL_MS = 60 * 60 * 1000

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const bugStore: any[] = (global as any).__agentEyeBugStore || []

  // Prune expired
  const cutoff = Date.now() - TTL_MS
  while (bugStore.length > 0 && bugStore[0].receivedAt < cutoff) {
    bugStore.shift()
  }

  const { severity, trigger, id, limit } = req.query

  // Single bug by ID (full detail)
  if (id && typeof id === 'string') {
    const bug = bugStore.find((b) => b.id === id)
    if (!bug) return res.status(404).json({ error: 'Bug not found' })
    return res.status(200).json({ bug })
  }

  let results = [...bugStore]

  // Filter by severity
  if (severity && typeof severity === 'string') {
    const validSeverities = Object.values(BUG_SEVERITY)
    if (validSeverities.includes(severity as any)) {
      results = results.filter((b) => b.severity === severity)
    }
  }

  // Filter by trigger
  if (trigger && typeof trigger === 'string') {
    const validTriggers = Object.values(TRIGGER_KIND)
    if (validTriggers.includes(trigger as any)) {
      results = results.filter((b) => b.trigger === trigger)
    }
  }

  // Limit
  const maxResults = Math.min(Number(limit) || 50, 200)

  // Return newest first, without full action timeline (summary view)
  const summary = results
    .slice(-maxResults)
    .reverse()
    .map((b) => ({
      id: b.id,
      trigger: b.trigger,
      severity: b.severity,
      message: b.message.slice(0, 200),
      url: b.url,
      filename: b.filename,
      line: b.line,
      timestamp: b.timestamp,
      actionCount: b.actions?.length || 0,
    }))

  return res.status(200).json({
    bugs: summary,
    total: results.length,
    bufferSize: bugStore.length,
  })
}
