/**
 * GET /api/feed/post?id=<postId>
 *
 * Single-post fetch, Vercel-direct (Phase 7e — Apollo strip).
 * Returns the rich PostComponentFields shape: profile, track, reactionTally,
 * topReactions, myReaction, isBookmarked. Mirrors `/api/feed/posts`
 * enrichment so usePostQuery consumers don't need a second resolver.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  res.setHeader('Cache-Control', 'private, no-store')

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })

  let oid: ObjectId
  try {
    oid = new ObjectId(id)
  } catch {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const auth = await authFromRequest(req)
  const viewerProfileId: ObjectId | null = auth?.profileId ?? null

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const post: any = await db.collection('posts').findOne({ _id: oid })
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const [author, track, myReaction, myBookmark] = await Promise.all([
      post.profileId
        ? db.collection('profiles')
            .findOne({ _id: post.profileId }, { projection: { displayName: 1, profilePicture: 1, userHandle: 1, verified: 1, teamMember: 1, badges: 1, tracksCount: 1 } as any })
        : Promise.resolve(null),
      post.trackId
        ? db.collection('tracks').findOne({ _id: post.trackId })
        : Promise.resolve(null),
      viewerProfileId
        ? db.collection('reactions').findOne({ profileId: viewerProfileId, postId: oid }, { projection: { type: 1 } as any })
        : Promise.resolve(null),
      viewerProfileId
        ? db.collection('bookmarks').findOne({ profileId: viewerProfileId, postId: oid }, { projection: { _id: 1 } as any })
        : Promise.resolve(null),
    ])

    const stats: Record<string, number> = post.reactionStats || {}
    const tally = Object.entries(stats)
      .filter(([, count]) => (count as number) > 0)
      .map(([type, count]) => ({ type, count }))
    tally.sort((a, b) => (b.count as number) - (a.count as number))
    const topReactions = tally.slice(0, 2).map(t => t.type)

    return res.status(200).json({
      post: {
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
        myReaction: (myReaction as any)?.type || null,
        deleted: post.deleted || false,
        isGuest: post.isGuest || false,
        walletAddress: post.walletAddress || null,
        uploadedMediaUrl: post.uploadedMediaUrl || null,
        uploadedMediaType: post.uploadedMediaType || null,
        mediaExpiresAt: post.mediaExpiresAt || null,
        isEphemeral: post.isEphemeral || false,
        isBookmarked: !!myBookmark,
        profileId: post.profileId?.toString() || null,
        profile: author ? {
          id: (author as any)._id.toString(),
          displayName: (author as any).displayName,
          profilePicture: (author as any).profilePicture,
          userHandle: (author as any).userHandle,
          verified: (author as any).verified || false,
          teamMember: (author as any).teamMember || false,
          badges: (author as any).badges || [],
          tracksCount: (author as any).tracksCount || 0,
        } : null,
        track: track ? {
          id: (track as any)._id.toString(),
          profileId: (track as any).profileId?.toString() || null,
          title: (track as any).title || '',
          assetUrl: (track as any).assetUrl || (track as any).playbackUrl || '',
          artworkUrl: (track as any).artworkUrl || '',
          description: (track as any).description || '',
          utilityInfo: (track as any).utilityInfo || '',
          artist: (track as any).artist || '',
          ISRC: (track as any).ISRC || null,
          artistId: (track as any).artistId || null,
          artistProfileId: (track as any).artistProfileId?.toString() || null,
          album: (track as any).album || '',
          releaseYear: (track as any).releaseYear || null,
          copyright: (track as any).copyright || '',
          genres: (track as any).genres || [],
          playbackUrl: (track as any).playbackUrl || (track as any).assetUrl || '',
          createdAt: (track as any).createdAt,
          updatedAt: (track as any).updatedAt || (track as any).createdAt,
          deleted: (track as any).deleted || false,
          playbackCountFormatted: String((track as any).playbackCount || 0),
          isFavorite: false,
          favoriteCount: (track as any).favoriteCount || 0,
          listingCount: (track as any).listingCount || 0,
          playbackCount: (track as any).playbackCount || 0,
          saleType: (track as any).saleType || null,
          price: (track as any).price || null,
          trackEditionId: (track as any).trackEditionId?.toString() || null,
          editionSize: (track as any).editionSize || null,
          nftData: (track as any).nftData || null,
          trackEdition: null,
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
