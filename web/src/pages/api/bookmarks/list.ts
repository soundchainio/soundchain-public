/**
 * GET /api/bookmarks/list — Vercel-direct replacement for bookmarks page Apollo query
 *
 * Returns bookmarked posts for the authenticated user.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ nodes: [] })

  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100)

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const bookmarks = await db.collection('bookmarks')
      .find({ profileId: auth.profileId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const postIds = bookmarks.map(b => b.postId).filter(Boolean)
    if (postIds.length === 0) return res.status(200).json({ nodes: [] })

    const posts = await db.collection('posts')
      .find({ _id: { $in: postIds } })
      .toArray()

    // Hydrate profiles
    const profileIds = [...new Set(posts.map(p => p.profileId?.toString()).filter(Boolean))]
    const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const profiles = profileOids.length > 0
      ? await db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1 }).toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const postMap = new Map(posts.map(p => [p._id.toString(), p]))
    const nodes = bookmarks.map(b => {
      const post = postMap.get(b.postId?.toString())
      if (!post) return null
      const author = profileMap.get(post.profileId?.toString())
      return {
        id: post._id.toString(),
        message: post.message || post.body || '',
        body: post.body || post.message || '',
        createdAt: post.createdAt || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaType: post.uploadedMediaType || null,
        linkUrl: post.linkUrl || null,
        isBookmarked: true,
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName || '',
          userHandle: author.userHandle || '',
          profilePicture: author.profilePicture || null,
          verified: author.verified || false,
          teamMember: author.teamMember || false,
          badges: author.badges || [],
          tracksCount: author.tracksCount || 0,
        } : null,
      }
    }).filter(Boolean)

    return res.status(200).json({ nodes })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
