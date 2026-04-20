/**
 * GET /api/nodeverse/my-frame-assets
 *
 * Returns the viewer's own bindable content for Nodeverse frames:
 *   { tracks: [...], nfts: [...], posts: [...] }
 *
 * Used by the Phase 3 frame-bind modal so users can mount their SCIDs,
 * NFTs, or wall posts into placed nft_frame / scid_frame / post_frame
 * buildables. Auth required — only the viewer's own content is listed.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  res.setHeader('Cache-Control', 'private, no-store')

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const [rawTracks, rawPosts] = await Promise.all([
      db.collection('tracks')
        .find({ profileId: auth.profileId, deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(100)
        .project({
          title: 1, artist: 1, artworkUrl: 1,
          playbackUrl: 1, assetUrl: 1,
          contractAddress: 1, tokenId: 1, createdAt: 1,
        })
        .toArray(),
      db.collection('posts')
        .find({ profileId: auth.profileId, deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(100)
        .project({
          body: 1, uploadedMediaUrl: 1, uploadedMediaType: 1,
          mediaThumbnail: 1, mediaLink: 1, createdAt: 1,
        })
        .toArray(),
    ])

    const tracks = rawTracks.map(t => ({
      id: t._id.toString(),
      title: t.title || 'Untitled',
      artist: t.artist || '',
      imageUrl: t.artworkUrl || null,
      audioUrl: t.playbackUrl || t.assetUrl || null,
      isNft: Boolean(t.contractAddress && t.tokenId),
    }))

    const nfts = tracks.filter(t => t.isNft)

    const posts = rawPosts
      .filter(p => p.uploadedMediaUrl || p.mediaThumbnail)
      .map(p => ({
        id: p._id.toString(),
        title: (p.body || '').slice(0, 60),
        imageUrl: p.mediaThumbnail || p.uploadedMediaUrl || null,
        audioUrl: p.uploadedMediaType === 'audio' ? p.uploadedMediaUrl || null : null,
        mediaType: p.uploadedMediaType || 'image',
      }))

    return res.status(200).json({ tracks, nfts, posts })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to load assets' })
  }
}
