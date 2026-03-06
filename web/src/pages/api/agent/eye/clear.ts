/**
 * Agent Eye — Clear Bugs Endpoint
 * POST /api/agent/eye/clear
 *
 * Clears all captured bugs from the in-memory buffer.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const bugStore: any[] = (global as any).__agentEyeBugStore || []
  const cleared = bugStore.length
  bugStore.length = 0

  return res.status(200).json({
    verdict: 'CLEARED',
    bugsCleared: cleared,
    timestamp: Date.now(),
  })
}
