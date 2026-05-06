/**
 * Tracking tab proxy — speed, distance, touches, drives, paint touches.
 * Upstream refresh cadence is ~60s during live; 60s TTL stays in sync.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBoxScoreTracking } from '@/lib/nbaStats'
import { nbaCachedProxy } from '@/lib/nbaProxy'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return nbaCachedProxy(req, res, {
    type: 'tracking',
    liveTtlMs: 60_000,
    fetcher: async (nbaGameId) => {
      const tracking = await fetchBoxScoreTracking(nbaGameId)
      return { tracking }
    },
  })
}
