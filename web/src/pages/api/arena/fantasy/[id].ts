/**
 * FANTASY LEAGUE DETAIL — full view: teams + roster + schedule + standings
 *
 * GET /api/arena/fantasy/[id] → complete league document
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { FantasyLeague } from 'lib/arena/fantasy/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: 'valid id required' })

  const client = await clientPromise
  const db = client.db('soundchain')
  const league = await db.collection<FantasyLeague>('fantasy_leagues').findOne({ _id: new ObjectId(id) as any })
  if (!league) return res.status(404).json({ error: 'league not found' })

  // Derive standings — sorted by wins desc, then totalPoints desc.
  const standings = [...league.teams]
    .map(t => ({
      ownerHandle: t.ownerHandle,
      teamName: t.teamName,
      wins: t.wins || 0,
      losses: t.losses || 0,
      totalPoints: Math.round((t.totalPoints || 0) * 100) / 100,
    }))
    .sort((a, b) => b.wins - a.wins || b.totalPoints - a.totalPoints)
    .map((t, i) => ({ ...t, rank: i + 1 }))

  return res.status(200).json({ league, standings })
}
