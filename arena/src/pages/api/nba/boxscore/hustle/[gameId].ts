/**
 * Hustle tab proxy — deflections, contested shots, screen assists, charges
 * drawn, loose balls recovered, box-outs. Updates roughly every quarter.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchBoxScoreHustle } from '@/lib/nbaStats'
import { nbaCachedProxy } from '@/lib/nbaProxy'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return nbaCachedProxy(req, res, {
    type: 'hustle',
    liveTtlMs: 60_000,
    fetcher: async (nbaGameId) => {
      const hustle = await fetchBoxScoreHustle(nbaGameId)
      return { hustle }
    },
  })
}
