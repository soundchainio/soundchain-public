/**
 * GET /api/feed/posts
 *
 * Vercel direct feed query — bypasses Lambda GraphQL.
 * Returns paginated feed posts hydrated to match PostComponentFields shape
 * so the existing <Post> component can consume the response unchanged.
 *
 * Query params:
 *   ?profileId=xxx — whose feed to load (optional; falls back to JWT cookie, then global)
 *   ?limit=25 — how many posts (max 50)
 *   ?cursor=xxx — pagination cursor (postedAt of last item, ISO string)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 'private, no-store')

  const queryProfileId = (req.query.profileId as string) || ''
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 50)
  const cursor = req.query.cursor as string

  const auth = await authFromRequest(req)
  const viewerProfileId: ObjectId | null = auth?.profileId ?? null

  // Resolve which feed to load: explicit profileId param > viewer's own > global
  let feedProfileOid: ObjectId | null = null
  if (queryProfileId) {
    try { feedProfileOid = new ObjectId(queryProfileId) } catch { feedProfileOid = null }
  } else if (viewerProfileId) {
    feedProfileOid = viewerProfileId
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    let posts: any[] = []
    let endCursor: string | null = null
    let hasNextPage = false

    if (feedProfileOid) {
      // Personal feed: read from feeditems fan-out collection
      const feedFilter: any = { profileId: feedProfileOid }
      if (cursor) feedFilter.postedAt = { $lt: new Date(cursor) }

      const feedItems = await db.collection('feeditems')
        .find(feedFilter)
        .sort({ postedAt: -1 })
        .limit(limit + 1)
        .toArray()

      hasNextPage = feedItems.length > limit
      if (hasNextPage) feedItems.pop()

      if (feedItems.length === 0) {
        return res.status(200).json({ posts: [], hasNextPage: false, endCursor: null })
      }

      const postIds = feedItems.map(fi => fi.postId).filter(Boolean)
      const rawPosts = await db.collection('posts')
        .find({ _id: { $in: postIds }, deleted: { $ne: true } })
        .toArray()

      const postMap = new Map(rawPosts.map(p => [p._id.toString(), p]))
      posts = feedItems.map(fi => postMap.get(fi.postId?.toString())).filter(Boolean)

      const lastItem = feedItems[feedItems.length - 1]
      endCursor = lastItem?.postedAt?.toISOString() || null
    } else {
      // Global feed fallback (no auth, no profileId): newest public posts
      const filter: any = { deleted: { $ne: true } }
      if (cursor) filter.createdAt = { $lt: new Date(cursor) }

      const rawPosts = await db.collection('posts')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .toArray()

      hasNextPage = rawPosts.length > limit
      if (hasNextPage) rawPosts.pop()
      posts = rawPosts
      endCursor = posts[posts.length - 1]?.createdAt?.toISOString() || null
    }

    if (posts.length === 0) {
      return res.status(200).json({ posts: [], hasNextPage: false, endCursor: null })
    }

    const postOids = posts.map(p => p._id)
    const authorOids = Array.from(new Set(posts.map(p => p.profileId).filter(Boolean).map((id: any) => id.toString())))
      .map(id => new ObjectId(id))
    const trackOids = Array.from(new Set(posts.map(p => p.trackId).filter(Boolean).map((id: any) => id.toString())))
      .map(id => new ObjectId(id))

    // Batch lookups — authors, tracks, viewer's reactions/bookmarks
    const [profiles, tracks, myReactions, myBookmarks] = await Promise.all([
      db.collection('profiles')
        .find({ _id: { $in: authorOids } })
        .project({ displayName: 1, profilePicture: 1, userHandle: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1 })
        .toArray(),
      trackOids.length
        ? db.collection('tracks').find({ _id: { $in: trackOids } }).toArray()
        : Promise.resolve([] as any[]),
      viewerProfileId
        ? db.collection('reactions')
            .find({ profileId: viewerProfileId, postId: { $in: postOids } })
            .project({ postId: 1, type: 1 })
            .toArray()
        : Promise.resolve([] as any[]),
      viewerProfileId
        ? db.collection('bookmarks')
            .find({ profileId: viewerProfileId, postId: { $in: postOids } })
            .project({ postId: 1 })
            .toArray()
        : Promise.resolve([] as any[]),
    ])

    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))
    const myReactionMap = new Map(myReactions.map((r: any) => [r.postId.toString(), r.type]))
    const myBookmarkSet = new Set(myBookmarks.map((b: any) => b.postId.toString()))

    const result = posts.map(post => {
      const author = profileMap.get(post.profileId?.toString())
      const track = post.trackId ? trackMap.get(post.trackId.toString()) : null

      // Build reactionTally + topReactions from post.reactionStats map
      const stats: Record<string, number> = post.reactionStats || {}
      const tally = Object.entries(stats)
        .filter(([, count]) => (count as number) > 0)
        .map(([type, count]) => ({ type, count }))
      tally.sort((a, b) => (b.count as number) - (a.count as number))
      const topReactions = tally.slice(0, 2).map(t => t.type)

      return {
        id: post._id.toString(),
        body: post.body || null,
        mediaLink: post.mediaLink || null,
        mediaThumbnail: post.mediaThumbnail || null,
        repostId: post.repostId ? post.repostId.toString() : null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt || post.createdAt,
        commentCount: post.commentCount || 0,
        repostCount: post.repostCount || 0,
        totalTippedOgun: post.totalTippedOgun || 0,
        tipCount: post.tipCount || 0,
        totalReactions: post.totalReactions || tally.reduce((sum, t) => sum + (t.count as number), 0),
        topReactions,
        reactionTally: tally,
        myReaction: myReactionMap.get(post._id.toString()) || null,
        deleted: post.deleted || false,
        isGuest: post.isGuest || false,
        walletAddress: post.walletAddress || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaType: post.uploadedMediaType || null,
        mediaExpiresAt: post.mediaExpiresAt || null,
        isEphemeral: post.isEphemeral || false,
        isBookmarked: myBookmarkSet.has(post._id.toString()),
        profile: author ? {
          id: author._id.toString(),
          displayName: author.displayName,
          profilePicture: author.profilePicture,
          userHandle: author.userHandle,
          verified: author.verified || false,
          teamMember: author.teamMember || false,
          badges: author.badges || [],
          tracksCount: author.tracksCount || 0,
        } : null,
        track: track ? {
          id: track._id.toString(),
          profileId: track.profileId?.toString() || null,
          title: track.title || '',
          assetUrl: track.assetUrl || track.playbackUrl || '',
          artworkUrl: track.artworkUrl || '',
          description: track.description || '',
          utilityInfo: track.utilityInfo || '',
          artist: track.artist || '',
          ISRC: track.ISRC || null,
          artistId: track.artistId || null,
          artistProfileId: track.artistProfileId?.toString() || null,
          album: track.album || '',
          releaseYear: track.releaseYear || null,
          copyright: track.copyright || '',
          genres: track.genres || [],
          playbackUrl: track.playbackUrl || track.assetUrl || '',
          createdAt: track.createdAt,
          updatedAt: track.updatedAt || track.createdAt,
          deleted: track.deleted || false,
          playbackCountFormatted: String(track.playbackCount || 0),
          isFavorite: false,
          favoriteCount: track.favoriteCount || 0,
          listingCount: track.listingCount || 0,
          playbackCount: track.playbackCount || 0,
          saleType: track.saleType || null,
          price: track.price || null,
          trackEditionId: track.trackEditionId?.toString() || null,
          editionSize: track.editionSize || null,
          nftData: track.nftData || null,
          trackEdition: null,
        } : null,
      }
    })

    return res.status(200).json({ posts: result, hasNextPage, endCursor })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
