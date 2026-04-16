/**
 * GET /api/feed/comments
 *
 * Vercel direct comment fetch — bypasses Lambda GraphQL.
 * Returns comments for a post with author profiles and nested replies.
 *
 * Query params:
 *   ?postId=xxx — required, which post's comments to load
 *   ?limit=5   — how many root comments (max 20)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 'private, no-store')

  const postId = req.query.postId as string
  if (!postId) return res.status(400).json({ error: 'postId required' })

  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20)

  let postOid: ObjectId
  try {
    postOid = new ObjectId(postId)
  } catch {
    return res.status(400).json({ error: 'Invalid postId' })
  }

  const auth = await authFromRequest(req)
  const viewerProfileId = auth?.profileId ?? null

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Fetch root comments (no replyToId) for this post
    // $in: [null] matches BOTH missing AND null (legacy GraphQL inserted null, undefined gets coerced to null)
    const rootComments = await db.collection('comments')
      .find({ postId: postOid, deleted: { $ne: true }, replyToId: { $in: [null] } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray()

    if (rootComments.length === 0) {
      return res.status(200).json({ comments: [] })
    }

    // Fetch replies for these root comments (up to 3 per root)
    const rootIds = rootComments.map(c => c._id)
    const replies = await db.collection('comments')
      .find({ replyToId: { $in: rootIds }, deleted: { $ne: true } })
      .sort({ createdAt: 1 })
      .toArray()

    // Group replies by parent
    const repliesByParent = new Map<string, any[]>()
    for (const reply of replies) {
      const parentKey = reply.replyToId.toString()
      if (!repliesByParent.has(parentKey)) repliesByParent.set(parentKey, [])
      repliesByParent.get(parentKey)!.push(reply)
    }

    // Count total replies per root (for "View X more replies" button)
    const replyCounts = await db.collection('comments').aggregate([
      { $match: { replyToId: { $in: rootIds }, deleted: { $ne: true } } },
      { $group: { _id: '$replyToId', count: { $sum: 1 } } },
    ]).toArray()
    const replyCountMap = new Map(replyCounts.map(r => [r._id.toString(), r.count]))

    // Collect all profile IDs we need to look up
    const allComments = [...rootComments, ...replies]
    const profileOids = Array.from(
      new Set(allComments.map(c => c.profileId).filter(Boolean).map((id: any) => id.toString()))
    ).map(id => new ObjectId(id))

    // Batch fetch author profiles
    const profiles = profileOids.length
      ? await db.collection('profiles')
          .find({ _id: { $in: profileOids } })
          .project({ displayName: 1, profilePicture: 1, userHandle: 1, verified: 1, teamMember: 1, badges: 1 })
          .toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    // Build comment object helper
    const buildComment = (c: any, childReplies?: any[]) => {
      const author = profileMap.get(c.profileId?.toString())
      return {
        id: c._id.toString(),
        body: c.body || '',
        postId: c.postId?.toString() || postId,
        createdAt: c.createdAt,
        deleted: c.deleted || false,
        isGuest: c.isGuest || false,
        walletAddress: c.walletAddress || null,
        replyToId: c.replyToId?.toString() || null,
        replyCount: replyCountMap.get(c._id.toString()) || 0,
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          profilePicture: author.profilePicture,
          userHandle: author.userHandle,
          verified: author.verified || false,
          teamMember: author.teamMember || false,
          badges: author.badges || [],
        } : null,
        replies: childReplies || [],
      }
    }

    // Build response — root comments with up to 3 inline replies each
    const result = rootComments.map(root => {
      const childReplies = (repliesByParent.get(root._id.toString()) || [])
        .slice(0, 3)
        .map(r => buildComment(r))
      return buildComment(root, childReplies)
    })

    return res.status(200).json({ comments: result })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
