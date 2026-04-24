/**
 * GET /api/arena/fantasy/players — fantasy-relevant NFL player list from ESPN.
 *
 * Fetches active players at QB/RB/WR/TE/K positions. 5-minute server cache.
 * Used by the draft board to populate the available-player list.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchFantasyRelevantPlayers, EspnPlayer } from 'lib/arena/fantasy/espn'

let cache: { data: { players: EspnPlayer[] }; ts: number } | null = null
const CACHE_MS = 5 * 60 * 1000  // 5 min

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(cache.data)
  }

  const players = await fetchFantasyRelevantPlayers()
  cache = { data: { players }, ts: Date.now() }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  return res.status(200).json({ players })
}
