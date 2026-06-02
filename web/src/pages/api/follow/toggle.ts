/**
 * POST /api/follow/toggle { followedId, action: 'follow' | 'unfollow' }
 *
 * Vercel direct — bypasses Lambda GraphQL for follow/unfollow.
 * Idempotent: follow is upsert, unfollow is delete.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { followedId, action } = req.body || {}
  if (!followedId || !action) return res.status(400).json({ error: 'followedId and action required' })

  let followedOid: ObjectId
  try { followedOid = new ObjectId(followedId) } catch { return res.status(400).json({ error: 'Invalid followedId' }) }

  if (followedOid.equals(auth.profileId)) return res.status(400).json({ error: "Can't follow yourself" })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const follows = db.collection('follows')
    const profiles = db.collection('profiles')

    // Legacy follows (written by the old Lambda FollowService) stored follower/followed
    // ids as STRINGS, while newer Vercel-direct writes use ObjectId. Match BOTH forms so
    // follow upserts don't duplicate and — the reported bug — the circle red-× actually
    // deletes the record. [[feedback_follows_id_string_vs_objectid]]
    const followerIdStr = auth.profileId.toString()
    const idMatch = {
      followerId: { $in: [auth.profileId, followerIdStr] as any[] },
      followedId: { $in: [followedOid, String(followedId)] as any[] },
    }

    if (action === 'follow') {
      const now = new Date()
      const upd = await follows.updateOne(
        idMatch,
        { $setOnInsert: { followerId: auth.profileId, followedId: followedOid, createdAt: now } },
        { upsert: true },
      )
      // Only bump counts when a new doc was inserted (avoid double-counting on retry)
      if (upd.upsertedCount > 0) {
        await Promise.all([
          profiles.updateOne({ _id: followedOid }, { $inc: { followerCount: 1 } }),
          profiles.updateOne({ _id: auth.profileId }, { $inc: { followingCount: 1 } }),
        ])
      }
      return res.status(200).json({ ok: true, isFollowed: true })
    }

    if (action === 'unfollow') {
      const del = await follows.deleteMany(idMatch)
      if (del.deletedCount > 0) {
        await Promise.all([
          profiles.updateOne({ _id: followedOid, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }),
          profiles.updateOne({ _id: auth.profileId, followingCount: { $gt: 0 } }, { $inc: { followingCount: -1 } }),
        ])
      }
      return res.status(200).json({ ok: true, isFollowed: false })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
