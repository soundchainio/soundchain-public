/**
 * Matchups tab proxy — player-on-player matchup splits (defender X spent N min
 * on attacker Y, Y scored P / Q assists / R turnovers). Sparse — many regular-
 * season games don't have matchup data populated until post-final.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBoxScoreMatchups } from '@/lib/nbaStats'
import { nbaCachedProxy } from '@/lib/nbaProxy'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return nbaCachedProxy(req, res, {
    type: 'matchups',
    liveTtlMs: 90_000,
    fetcher: async (nbaGameId) => {
      const matchups = await fetchBoxScoreMatchups(nbaGameId)
      return { matchups }
    },
  })
}
