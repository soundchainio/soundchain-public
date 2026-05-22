/**
 * GET /api/marketplace/bids?auctionId=<id> — Vercel-direct (Phase 7e)
 * Returns bid history with bidder profile hydration.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auctionId = req.query.auctionId as string
  if (!auctionId) return res.status(400).json({ error: 'auctionId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    let filter: any
    try { filter = { auctionId: new ObjectId(auctionId) } } catch { filter = { auctionId } }

    const bids = await db.collection('bids')
      .find(filter)
      .sort({ createdAt: -1, amount: -1 })
      .limit(100)
      .toArray()

    const profileIds = [...new Set(bids.map(b => b.profileId?.toString()).filter(Boolean))]
    const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const profiles = profileOids.length > 0
      ? await db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1 }).toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const enriched = bids.map(b => {
      const p = profileMap.get(b.profileId?.toString())
      return {
        amount: String(b.amount || '0'),
        amountToShow: b.amountToShow ?? Number(b.amount || 0),
        userId: b.userId || null,
        profileId: b.profileId?.toString() || null,
        createdAt: b.createdAt,
        profile: p ? {
          profilePicture: p.profilePicture || null,
          displayName: p.displayName || '',
          userHandle: p.userHandle || '',
          verified: p.verified || false,
          teamMember: p.teamMember || false,
          badges: p.badges || [],
        } : null,
      }
    })

    return res.status(200).json({ bids: enriched })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
