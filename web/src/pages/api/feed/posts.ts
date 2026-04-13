/**
 * GET /api/feed/posts
 *
 * PHASE 2: Vercel direct feed query — bypasses Lambda GraphQL.
 * Returns paginated feed posts with author profiles.
 *
 * Query params:
 *   ?profileId=xxx — whose feed to load
 *   ?limit=25 — how many posts (max 50)
 *   ?cursor=xxx — pagination cursor (createdAt of last post)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // Edge cache 30s — feed doesn't need real-time on every request
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')

  const profileId = req.query.profileId as string
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 50)
  const cursor = req.query.cursor as string

  if (!profileId) return res.status(400).json({ error: 'profileId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Get feed items for this profile (sorted by newest first)
    const feedFilter: any = { profileId: new ObjectId(profileId) }
    if (cursor) {
      feedFilter.postedAt = { $lt: new Date(cursor) }
    }

    const feedItems = await db.collection('feeditems')
      .find(feedFilter)
      .sort({ postedAt: -1 })
      .limit(limit + 1) // +1 to check hasNextPage
      .toArray()

    const hasNextPage = feedItems.length > limit
    if (hasNextPage) feedItems.pop()

    if (feedItems.length === 0) {
      return res.status(200).json({
        posts: [],
        hasNextPage: false,
        endCursor: null,
      })
    }

    // Batch fetch all posts
    const postIds = feedItems.map(fi => fi.postId)
    const posts = await db.collection('posts')
      .find({ _id: { $in: postIds }, deleted: { $ne: true } })
      .toArray()

    const postMap = new Map(posts.map(p => [p._id.toString(), p]))

    // Batch fetch all author profiles
    const authorIds = [...new Set(posts.map(p => p.profileId?.toString()).filter(Boolean))]
    const profiles = await db.collection('profiles')
      .find({ _id: { $in: authorIds.map(id => new ObjectId(id)) } })
      .project({ displayName: 1, profilePicture: 1, userHandle: 1, verified: 1, teamMember: 1, badges: 1 })
      .toArray()

    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    // Assemble response
    const result = feedItems.map(fi => {
      const post = postMap.get(fi.postId?.toString())
      if (!post) return null

      const author = profileMap.get(post.profileId?.toString())

      return {
        id: post._id.toString(),
        body: post.body || null,
        mediaLink: post.mediaLink || null,
        mediaThumbnail: post.mediaThumbnail || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaType: post.uploadedMediaType || null,
        repostId: post.repostId || null,
        trackId: post.trackId || null,
        createdAt: post.createdAt,
        commentCount: post.commentCount || 0,
        repostCount: post.repostCount || 0,
        totalReactions: post.totalReactions || 0,
        deleted: post.deleted || false,
        isEphemeral: post.isEphemeral || false,
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          profilePicture: author.profilePicture,
          userHandle: author.userHandle,
          verified: author.verified || false,
          teamMember: author.teamMember || false,
          badges: author.badges || [],
        } : null,
      }
    }).filter(Boolean)

    const lastItem = feedItems[feedItems.length - 1]

    return res.status(200).json({
      posts: result,
      hasNextPage,
      endCursor: lastItem?.postedAt?.toISOString() || null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
