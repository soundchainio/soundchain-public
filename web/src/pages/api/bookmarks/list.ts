/**
 * GET /api/bookmarks/list — Vercel-direct (Phase 7e Apollo strip)
 *
 * ?limit=20&cursor=xxx — pagination
 * Returns Apollo MyBookmarksQuery shape:
 *   { nodes: [{ id, postId, createdAt, post: PostComponentFields }],
 *     pageInfo: { totalCount, hasNextPage, hasPreviousPage } }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } })

  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100)
  const cursor = req.query.cursor as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { profileId: auth.profileId }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const bookmarks = await db.collection('bookmarks')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray()

    const hasNextPage = bookmarks.length > limit
    if (hasNextPage) bookmarks.pop()

    const postIds = bookmarks.map(b => b.postId).filter(Boolean)
    if (postIds.length === 0) {
      return res.status(200).json({ nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } })
    }

    const posts = await db.collection('posts')
      .find({ _id: { $in: postIds } })
      .toArray()

    // Hydrate profiles + tracks for enrichment
    const profileIds = [...new Set(posts.map(p => p.profileId?.toString()).filter(Boolean))]
    const profileOids = profileIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const trackIds = [...new Set(posts.map(p => p.trackId?.toString()).filter(Boolean))]
    const trackOids = trackIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]

    const postOids = posts.map(p => p._id)
    const [profiles, tracks, myReactions] = await Promise.all([
      profileOids.length > 0
        ? db.collection('profiles').find({ _id: { $in: profileOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1 }).toArray()
        : Promise.resolve([] as any[]),
      trackOids.length > 0
        ? db.collection('tracks').find({ _id: { $in: trackOids } }).toArray()
        : Promise.resolve([] as any[]),
      db.collection('reactions')
        .find({ profileId: auth.profileId, postId: { $in: postOids } })
        .project({ postId: 1, type: 1 })
        .toArray(),
    ])
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))
    const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))
    const myReactionMap = new Map(myReactions.map((r: any) => [r.postId.toString(), r.type]))
    const postMap = new Map(posts.map(p => [p._id.toString(), p]))

    const nodes = bookmarks.map(b => {
      const post = postMap.get(b.postId?.toString())
      if (!post) return null
      const author = profileMap.get(post.profileId?.toString())
      const track = post.trackId ? trackMap.get(post.trackId.toString()) : null

      const stats: Record<string, number> = post.reactionStats || {}
      const tally = Object.entries(stats)
        .filter(([, count]) => (count as number) > 0)
        .map(([type, count]) => ({ type, count }))
      tally.sort((a, b) => (b.count as number) - (a.count as number))
      const topReactions = tally.slice(0, 2).map(t => t.type)

      const enrichedPost = {
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
        isBookmarked: true,
        profileId: post.profileId?.toString() || null,
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
          artist: track.artist || '',
          playbackUrl: track.playbackUrl || track.assetUrl || '',
          createdAt: track.createdAt,
          updatedAt: track.updatedAt || track.createdAt,
          deleted: track.deleted || false,
          favoriteCount: track.favoriteCount || 0,
          playbackCount: track.playbackCount || 0,
          playbackCountFormatted: String(track.playbackCount || 0),
          isFavorite: false,
          saleType: track.saleType || null,
          price: track.price || null,
          listingCount: track.listingCount || 0,
          trackEditionId: track.trackEditionId?.toString() || null,
          editionSize: track.editionSize || null,
          nftData: track.nftData || null,
          trackEdition: null,
        } : null,
      }

      return {
        id: b._id.toString(),
        postId: post._id.toString(),
        createdAt: b.createdAt || post.createdAt || null,
        post: enrichedPost,
      }
    }).filter(Boolean)

    return res.status(200).json({
      nodes,
      pageInfo: { totalCount: nodes.length, hasNextPage, hasPreviousPage: false },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
