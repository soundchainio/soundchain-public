/**
 * GET /api/reactions/list?postId=<postId>[&limit=20] — Vercel-direct (Phase 7e)
 * Returns reactions on a post w/ reactor profile hydration.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const postId = req.query.postId as string
  if (!postId) return res.status(400).json({ error: 'postId required' })
  let postOid: ObjectId
  try { postOid = new ObjectId(postId) } catch { return res.status(400).json({ error: 'Invalid postId' }) }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
  const type = req.query.type as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { postId: postOid }
    if (type) filter.type = type

    const reactions = await db.collection('reactions')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const profileIds = [...new Set(reactions.map(r => r.profileId?.toString()).filter(Boolean))]
    const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const profiles = profileOids.length > 0
      ? await db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, badges: 1 }).toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const nodes = reactions.map(r => {
      const p = profileMap.get(r.profileId?.toString())
      return {
        id: r._id.toString(),
        type: r.type || 'LIKE',
        profile: p ? {
          id: p._id.toString(),
          userHandle: p.userHandle || '',
          displayName: p.displayName || '',
          profilePicture: p.profilePicture || null,
          verified: p.verified || false,
          badges: p.badges || [],
        } : null,
      }
    })

    return res.status(200).json({
      nodes,
      pageInfo: { hasNextPage: reactions.length === limit, endCursor: null, totalCount: nodes.length },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
