import { trackEvent, logActivity } from 'lib/api/trackEvent'
/**
 * POST /api/feed/follow
 *
 * PHASE 3: Vercel direct follow/unfollow — bypasses Lambda.
 *
 * Body: { followerId: string, followedId: string, action: 'follow' | 'unfollow' }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { followerId, followedId, action } = req.body

  if (!followerId || !followedId || !['follow', 'unfollow'].includes(action)) {
    return res.status(400).json({ error: 'followerId, followedId, and action (follow/unfollow) required' })
  }

  if (followerId === followedId) return res.status(400).json({ error: 'Cannot follow yourself' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const followsCol = db.collection('follows')
    const profilesCol = db.collection('profiles')

    const followerOid = new ObjectId(followerId)
    const followedOid = new ObjectId(followedId)

    if (action === 'follow') {
      // Check if already following
      const existing = await followsCol.findOne({ followerId: followerOid, followedId: followedOid })
      if (existing) return res.status(200).json({ ok: true, action: 'already_following' })

      // Create follow
      await followsCol.insertOne({
        followerId: followerOid,
        followedId: followedOid,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Update counts
      await Promise.all([
        profilesCol.updateOne({ _id: followerOid }, { $inc: { followingCount: 1 } }),
        profilesCol.updateOne({ _id: followedOid }, { $inc: { followerCount: 1 } }),
      ])

      // Add recent posts to follower's feed (fan-out)
      const recentPosts = await db.collection('posts')
        .find({ profileId: followedOid, deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ _id: 1, createdAt: 1 })
        .toArray()

      if (recentPosts.length > 0) {
        const feedItems = recentPosts.map(p => ({
          profileId: followerOid,
          postId: p._id,
          postedAt: p.createdAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
        await db.collection('feeditems').insertMany(feedItems, { ordered: false }).catch(() => {})
      }

      trackEvent('follow_user', { followedId }, followerId)
      logActivity(followerOid, 'FOLLOWED', followedOid)
      return res.status(200).json({ ok: true, action: 'followed' })
    }

    if (action === 'unfollow') {
      const deleted = await followsCol.deleteOne({ followerId: followerOid, followedId: followedOid })
      if (deleted.deletedCount > 0) {
        await Promise.all([
          profilesCol.updateOne({ _id: followerOid }, { $inc: { followingCount: -1 } }),
          profilesCol.updateOne({ _id: followedOid }, { $inc: { followerCount: -1 } }),
        ])
      }
      return res.status(200).json({ ok: true, action: 'unfollowed' })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
