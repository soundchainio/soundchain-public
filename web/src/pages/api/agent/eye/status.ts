/**
 * Agent Eye — Status Endpoint
 * GET /api/agent/eye/status
 *
 * Returns Agent Eye mode, bug counts by severity, buffer capacity.
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
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

  const counts = {
    [BUG_SEVERITY.CRITICAL]: 0,
    [BUG_SEVERITY.ERROR]: 0,
    [BUG_SEVERITY.WARNING]: 0,
    [BUG_SEVERITY.INFO]: 0,
  }

  for (const bug of bugStore) {
    if (bug.severity === BUG_SEVERITY.CRITICAL) counts[BUG_SEVERITY.CRITICAL]++
    else if (bug.severity === BUG_SEVERITY.ERROR) counts[BUG_SEVERITY.ERROR]++
    else if (bug.severity === BUG_SEVERITY.WARNING) counts[BUG_SEVERITY.WARNING]++
    else if (bug.severity === BUG_SEVERITY.INFO) counts[BUG_SEVERITY.INFO]++
  }

  // Oldest and newest bug timestamps
  const oldestBug = bugStore.length > 0 ? bugStore[0].timestamp : null
  const newestBug = bugStore.length > 0 ? bugStore[bugStore.length - 1].timestamp : null

  return res.status(200).json({
    mode: 'WATCHING',
    bufferSize: bugStore.length,
    bufferCapacity: 200,
    ttlMinutes: 60,
    counts,
    totalBugs: bugStore.length,
    oldestBug,
    newestBug,
    timestamp: Date.now(),
  })
}
