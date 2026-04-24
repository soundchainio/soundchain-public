/**
 * GET /api/tracks/list — Vercel-direct replacement for useGroupedTracksQuery + useTracksQuery
 *
 * Flexible track listing with filters:
 *   ?profileId=xxx — tracks by creator
 *   ?owner=0x... — NFTs owned by wallet address
 *   ?genre=hip-hop — tracks by genre
 *   ?sort=newest|oldest|popular — sort order
 *   ?limit=20&cursor=xxx — pagination
 *   ?favorites=true — requires auth, returns user's favorited tracks
 *   ?trackId=xxx — single track by ID
 *
 * Returns TrackComponentFields shape for drop-in replacement.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const profileId = req.query.profileId as string
  const owner = req.query.owner as string
  const genre = req.query.genre as string
  const sort = (req.query.sort as string) || 'newest'
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string
  const favorites = req.query.favorites === 'true'
  const trackId = req.query.trackId as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const auth = await authFromRequest(req)

    // Single track by ID
    if (trackId) {
      let track: any
      try {
        track = await db.collection('tracks').findOne({ _id: new ObjectId(trackId), deleted: { $ne: true } })
      } catch { track = null }
      if (!track) return res.status(404).json({ error: 'Track not found' })

      // Check if favorited by viewer
      let isFavorite = false
      if (auth) {
        const fav = await db.collection('favorites').findOne({ profileId: auth.profileId, trackId: track._id })
        isFavorite = !!fav
      }

      const shaped = shapeTrack(track, isFavorite)
      return res.status(200).json({ track: shaped })
    }

    // Favorites — requires auth
    if (favorites) {
      if (!auth) return res.status(200).json({ nodes: [], pageInfo: { hasNextPage: false, totalCount: 0 } })
      const favDocs = await db.collection('favorites')
        .find({ profileId: auth.profileId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray()
      const trackIds = favDocs.map(f => f.trackId).filter(Boolean)
      if (trackIds.length === 0) return res.status(200).json({ nodes: [], pageInfo: { hasNextPage: false, totalCount: 0 } })

      const tracks = await db.collection('tracks')
        .find({ _id: { $in: trackIds }, deleted: { $ne: true } })
        .toArray()
      const trackMap = new Map(tracks.map(t => [t._id.toString(), t]))
      const ordered = trackIds.map(id => trackMap.get(id.toString())).filter(Boolean)
      return res.status(200).json({
        nodes: ordered.map(t => shapeTrack(t!, true)),
        pageInfo: { hasNextPage: favDocs.length === limit, totalCount: ordered.length },
      })
    }

    // Build filter
    const filter: any = { deleted: { $ne: true } }
    if (profileId) {
      try { filter.profileId = new ObjectId(profileId) } catch { /* invalid id */ }
    }
    if (owner) {
      filter['nftData.owner'] = { $regex: new RegExp(`^${owner}$`, 'i') }
    }
    if (genre) {
      filter.genres = { $in: [genre] }
    }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch { /* invalid cursor */ }
    }

    // Sort
    const sortObj: any = sort === 'oldest' ? { createdAt: 1 }
      : sort === 'popular' ? { playbackCount: -1, createdAt: -1 }
      : { createdAt: -1 } // newest (default)

    const tracks = await db.collection('tracks')
      .find(filter)
      .sort(sortObj)
      .limit(limit + 1) // +1 to detect hasNextPage
      .toArray()

    const hasNextPage = tracks.length > limit
    if (hasNextPage) tracks.pop()

    // Check favorites for viewer
    let favSet = new Set<string>()
    if (auth && tracks.length > 0) {
      const trackOids = tracks.map(t => t._id)
      const favs = await db.collection('favorites')
        .find({ profileId: auth.profileId, trackId: { $in: trackOids } })
        .project({ trackId: 1 })
        .toArray()
      favSet = new Set(favs.map(f => f.trackId.toString()))
    }

    const nodes = tracks.map(t => shapeTrack(t, favSet.has(t._id.toString())))

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: tracks.length > 0 ? tracks[tracks.length - 1]._id.toString() : null,
        totalCount: nodes.length,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

function shapeTrack(t: any, isFavorite: boolean = false) {
  return {
    id: t._id.toString(),
    profileId: t.profileId?.toString() || null,
    title: t.title || '',
    assetUrl: t.assetUrl || '',
    artworkUrl: t.artworkUrl || '',
    description: t.description || '',
    utilityInfo: t.utilityInfo || '',
    artist: t.artist || '',
    ISRC: t.ISRC || '',
    artistId: t.artistId?.toString() || null,
    artistProfileId: t.artistProfileId?.toString() || null,
    album: t.album || '',
    releaseYear: t.releaseYear || null,
    copyright: t.copyright || '',
    genres: t.genres || [],
    playbackUrl: t.playbackUrl || t.assetUrl || '',
    createdAt: t.createdAt || null,
    updatedAt: t.updatedAt || null,
    deleted: t.deleted || false,
    playbackCountFormatted: t.playbackCountFormatted || '0',
    isFavorite,
    favoriteCount: t.favoriteCount || 0,
    listingCount: t.listingCount || 0,
    playbackCount: t.playbackCount || 0,
    saleType: t.saleType || null,
    price: t.price || null,
    trackEditionId: t.trackEditionId?.toString() || null,
    editionSize: t.editionSize || null,
    nftData: t.nftData ? {
      transactionHash: t.nftData.transactionHash || null,
      tokenId: t.nftData.tokenId ?? null,
      contract: t.nftData.contract || null,
      minter: t.nftData.minter || null,
      ipfsCid: t.nftData.ipfsCid || null,
      pendingRequest: t.nftData.pendingRequest || null,
      owner: t.nftData.owner || null,
      pendingTime: t.nftData.pendingTime || null,
    } : null,
    trackEdition: t.trackEdition || null,
  }
}
