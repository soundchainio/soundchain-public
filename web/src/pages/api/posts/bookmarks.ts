/**
 * GET /api/posts/bookmarks — Fetch user's bookmarked posts
 * Auth required. Returns { posts, totalCount }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100)
  const skip = parseInt(req.query.skip as string) || 0
  const folder = (req.query.folder as string)?.trim() || ''

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Build filter — optionally filter by folder (posts/reels/stories/music/media)
    const filter: any = { profileId: auth.profileId }
    if (folder) filter.folder = folder

    // Get bookmarks
    const bookmarks = await db.collection('bookmarks')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const totalCount = await db.collection('bookmarks').countDocuments(filter)

    // Folder counts for UI badges — ALWAYS return regardless of filter
    const folderAgg = await db.collection('bookmarks').aggregate([
      { $match: { profileId: auth.profileId } },
      { $group: { _id: { $ifNull: ['$folder', 'posts'] }, count: { $sum: 1 } } },
    ]).toArray()
    const folderCounts: Record<string, number> = {}
    folderAgg.forEach((f: any) => { folderCounts[f._id] = f.count })

    if (bookmarks.length === 0) return res.status(200).json({ posts: [], totalCount, folderCounts })

    // Batch fetch posts
    const postIds = bookmarks.map(b => b.postId)
    const posts = await db.collection('posts')
      .find({ _id: { $in: postIds }, deleted: { $ne: true } })
      .toArray()

    const postMap = new Map(posts.map(p => [p._id.toString(), p]))

    // Batch fetch author profiles
    const authorIds = [...new Set(posts.map(p => p.profileId?.toString()).filter(Boolean))]
    const profiles = await db.collection('profiles')
      .find({ _id: { $in: authorIds.map(id => new ObjectId(id)) } })
      .project({ displayName: 1, profilePicture: 1, userHandle: 1, verified: 1 })
      .toArray()
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const result = bookmarks.map(b => {
      const post = postMap.get(b.postId?.toString())
      if (!post) return null
      const author = profileMap.get(post.profileId?.toString())
      return {
        id: post._id.toString(),
        body: post.body || null,
        mediaLink: post.mediaLink || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaUrls: post.uploadedMediaUrls || null,
        uploadedMediaType: post.uploadedMediaType || null,
        mediaThumbnail: post.mediaThumbnail || null,
        trackId: post.trackId || null,
        createdAt: post.createdAt,
        commentCount: post.commentCount || 0,
        totalReactions: post.totalReactions || 0,
        bookmarkedAt: b.createdAt,
        folder: b.folder || 'posts',
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          profilePicture: author.profilePicture,
          userHandle: author.userHandle,
          verified: author.verified || false,
        } : null,
      }
    }).filter(Boolean)

    return res.status(200).json({ posts: result, totalCount, folderCounts })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
