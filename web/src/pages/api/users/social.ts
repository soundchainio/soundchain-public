/**
 * GET /api/users/social — Vercel-direct replacement for useFollowersQuery/useFollowingQuery
 *
 * ?profileId=xxx&type=followers — list followers
 * ?profileId=xxx&type=following — list following
 * ?limit=50&cursor=xxx — pagination
 *
 * POST /api/users/social — follow/unfollow
 * { action: 'follow'|'unfollow', targetProfileId: 'xxx' }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')

  // GET — list followers or following
  if (req.method === 'GET') {
    const profileId = req.query.profileId as string
    const type = req.query.type as string // 'followers' | 'following'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

    if (!profileId || !type) return res.status(400).json({ error: 'profileId and type required' })

    try {
      const pid = new ObjectId(profileId)

      if (type === 'followers') {
        const follows = await db.collection('follows')
          .find({ followingProfileId: pid })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray()

        const followerIds = follows.map(f => f.followerProfileId).filter(Boolean)
        const profiles = followerIds.length > 0
          ? await db.collection('profiles')
              .find({ _id: { $in: followerIds } })
              .project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1, followerCount: 1 })
              .toArray()
          : []

        const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))
        const nodes = follows.map(f => {
          const p = profileMap.get(f.followerProfileId?.toString())
          if (!p) return null
          return {
            id: f._id.toString(),
            followerProfile: {
              id: p._id.toString(),
              displayName: p.displayName || '',
              userHandle: p.userHandle || '',
              profilePicture: p.profilePicture || null,
              verified: p.verified || false,
              teamMember: p.teamMember || false,
              badges: p.badges || [],
              tracksCount: p.tracksCount || 0,
              followerCount: p.followerCount || 0,
            },
          }
        }).filter(Boolean)

        return res.status(200).json({ nodes, pageInfo: { totalCount: nodes.length } })

      } else if (type === 'following') {
        const follows = await db.collection('follows')
          .find({ followerProfileId: pid })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray()

        const followingIds = follows.map(f => f.followingProfileId).filter(Boolean)
        const profiles = followingIds.length > 0
          ? await db.collection('profiles')
              .find({ _id: { $in: followingIds } })
              .project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1, followerCount: 1 })
              .toArray()
          : []

        const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))
        const nodes = follows.map(f => {
          const p = profileMap.get(f.followingProfileId?.toString())
          if (!p) return null
          return {
            id: f._id.toString(),
            followingProfile: {
              id: p._id.toString(),
              displayName: p.displayName || '',
              userHandle: p.userHandle || '',
              profilePicture: p.profilePicture || null,
              verified: p.verified || false,
              teamMember: p.teamMember || false,
              badges: p.badges || [],
              tracksCount: p.tracksCount || 0,
              followerCount: p.followerCount || 0,
            },
          }
        }).filter(Boolean)

        return res.status(200).json({ nodes, pageInfo: { totalCount: nodes.length } })
      }

      return res.status(400).json({ error: 'type must be followers or following' })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — follow/unfollow
  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const { action, targetProfileId } = req.body || {}
    if (!action || !targetProfileId) return res.status(400).json({ error: 'action and targetProfileId required' })

    try {
      const targetId = new ObjectId(targetProfileId)

      if (action === 'follow') {
        // Prevent self-follow
        if (auth.profileId.toString() === targetProfileId) return res.status(400).json({ error: 'Cannot follow self' })

        // Upsert follow
        await db.collection('follows').updateOne(
          { followerProfileId: auth.profileId, followingProfileId: targetId },
          { $setOnInsert: { followerProfileId: auth.profileId, followingProfileId: targetId, createdAt: new Date() } },
          { upsert: true }
        )
        // Increment counts
        await Promise.all([
          db.collection('profiles').updateOne({ _id: targetId }, { $inc: { followerCount: 1 } }),
          db.collection('profiles').updateOne({ _id: auth.profileId }, { $inc: { followingCount: 1 } }),
        ])
        return res.status(200).json({ success: true, action: 'followed' })

      } else if (action === 'unfollow') {
        const result = await db.collection('follows').deleteOne({
          followerProfileId: auth.profileId, followingProfileId: targetId,
        })
        if (result.deletedCount > 0) {
          await Promise.all([
            db.collection('profiles').updateOne({ _id: targetId }, { $inc: { followerCount: -1 } }),
            db.collection('profiles').updateOne({ _id: auth.profileId }, { $inc: { followingCount: -1 } }),
          ])
        }
        return res.status(200).json({ success: true, action: 'unfollowed' })
      }

      return res.status(400).json({ error: 'action must be follow or unfollow' })
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
