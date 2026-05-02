/**
 * FANTASY LEAGUES — list + create
 *
 * GET  /api/arena/fantasy              → list open + live leagues (paginated)
 * POST /api/arena/fantasy              → create a league (auth required)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import {
  FantasyLeague,
  DEFAULT_PRIZE_SPLIT,
  DEFAULT_ROSTER_TEMPLATE,
  EntryToken,
  TOKEN_CONFIG,
} from 'lib/arena/fantasy/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const leagues = db.collection<FantasyLeague>('fantasy_leagues')

  if (req.method === 'GET') {
    const status = (req.query.status as string) || 'all'
    const filter: any = status === 'all'
      ? { status: { $in: ['open', 'drafting', 'live', 'complete'] } }
      : { status }
    const docs = await leagues
      .find(filter, { projection: { schedule: 0 } })  // trim schedule from list view
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return res.status(200).json({ leagues: docs })
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { leagueName, maxTeams } = req.body || {}
    if (!leagueName || typeof leagueName !== 'string' || leagueName.length < 3 || leagueName.length > 60) {
      return res.status(400).json({ error: 'leagueName required (3-60 chars)' })
    }
    const teams = Number(maxTeams)
    if (![4, 6, 8, 10, 12, 14].includes(teams)) {
      return res.status(400).json({ error: 'maxTeams must be one of 4, 6, 8, 10, 12, 14' })
    }
    // Free-to-play only as of May 2, 2026 — entry fee + prize-split wiring paused for compliance.
    // Existing leagues continue to function under whatever fee they were created with;
    // new leagues are zero-stake leaderboard glory only.
    const token: EntryToken = 'OGUN'
    const fee = 0
    const split = DEFAULT_PRIZE_SPLIT

    const profiles = db.collection('profiles')
    const me = await profiles.findOne({ _id: auth.profileId })
    if (!me) return res.status(404).json({ error: 'profile not found' })
    const myHandle = me.userHandle || `user_${auth.profileId.toString().slice(-6)}`

    const now = new Date().toISOString()
    const doc: FantasyLeague = {
      leagueName: leagueName.trim(),
      sport: 'NFL',
      commissionerHandle: myHandle,
      commissionerProfileId: auth.profileId.toString(),
      status: 'open',
      maxTeams: teams,
      entryToken: token,
      entryFee: fee,
      prizeSplit: split,
      teams: [],
      schedule: [],
      draftOrder: [],
      currentPickIndex: 0,
      draftRounds: DEFAULT_ROSTER_TEMPLATE.length,
      tradeDeadlineWeek: 12,
      trades: [],
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await leagues.insertOne(doc as any)
    return res.status(200).json({ ok: true, leagueId: insertedId, league: { ...doc, _id: insertedId } })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
