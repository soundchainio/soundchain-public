/**
 * GET /api/wall/posts?profileId=xxx&limit=20
 *
 * Vercel direct wall fetch — bypasses Lambda GraphQL.
 * Returns wall posts (root) with nested replies, hydrated to match
 * the WallPosts GraphQL query shape so ProfileWall renders unchanged.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 'private, no-store')

  const profileId = req.query.profileId as string
  if (!profileId) return res.status(400).json({ error: 'profileId required' })

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  let profileOid: ObjectId
  try {
    profileOid = new ObjectId(profileId)
  } catch {
    return res.status(400).json({ error: 'Invalid profileId' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Root wall posts: pinned first, then newest
    // $in: [null] matches both missing and null (legacy GraphQL stored null)
    const rootPosts = await db.collection('wallposts')
      .find({ profileId: profileOid, deleted: { $ne: true }, replyToId: { $in: [null] } })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(limit)
      .toArray()

    const totalCount = await db.collection('wallposts')
      .countDocuments({ profileId: profileOid, deleted: { $ne: true }, replyToId: { $in: [null] } })

    if (rootPosts.length === 0) {
      return res.status(200).json({
        wallPosts: { nodes: [], pageInfo: { totalCount: 0, hasNextPage: false } },
      })
    }

    const rootIds = rootPosts.map(p => p._id)
    const replies = await db.collection('wallposts')
      .find({ replyToId: { $in: rootIds }, deleted: { $ne: true } })
      .sort({ createdAt: 1 })
      .toArray()

    const repliesByParent = new Map<string, any[]>()
    for (const r of replies) {
      const k = r.replyToId.toString()
      if (!repliesByParent.has(k)) repliesByParent.set(k, [])
      repliesByParent.get(k)!.push(r)
    }

    const allPosts = [...rootPosts, ...replies]
    const authorOids = Array.from(
      new Set(allPosts.map(p => p.authorProfileId).filter(Boolean).map((id: any) => id.toString())),
    ).map(id => new ObjectId(id))

    const profiles = authorOids.length
      ? await db.collection('profiles')
          .find({ _id: { $in: authorOids } })
          .project({ displayName: 1, profilePicture: 1, userHandle: 1 })
          .toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const buildPost = (p: any) => {
      const author = profileMap.get(p.authorProfileId?.toString())
      return {
        id: p._id.toString(),
        profileId: p.profileId?.toString() || profileId,
        authorProfileId: p.authorProfileId?.toString() || null,
        body: p.body || '',
        pinned: p.pinned || false,
        createdAt: p.createdAt,
        mediaUrl: p.mediaUrl || null,
        mediaType: p.mediaType || null,
        coverArtUrl: p.coverArtUrl || null,
        mediaThumbnailUrl: p.mediaThumbnailUrl || null,
        mediaTitle: p.mediaTitle || null,
        author: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          userHandle: author.userHandle,
          profilePicture: author.profilePicture,
        } : null,
      }
    }

    const nodes = rootPosts.map(root => {
      const childReplies = (repliesByParent.get(root._id.toString()) || []).map(buildPost)
      return {
        ...buildPost(root),
        replyCount: childReplies.length,
        replies: childReplies,
      }
    })

    return res.status(200).json({
      wallPosts: { nodes, pageInfo: { totalCount, hasNextPage: totalCount > limit } },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
