/**
 * GET /api/feed/tracks
 *
 * PHASE 3: Vercel direct track query — bypasses Lambda.
 *
 * Query params:
 *   ?profileId=xxx — tracks by this profile
 *   ?limit=25 — how many (max 50)
 *   ?search=xxx — search by title/artist
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const profileId = req.query.profileId as string
  const search = req.query.search as string
  const limit = Math.min(parseInt(req.query.limit as string) || 25, 50)

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { deleted: { $ne: true } }
    if (profileId) filter.profileId = new ObjectId(profileId)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
      ]
    }

    const tracks = await db.collection('tracks')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({
        title: 1, artist: 1, album: 1, description: 1,
        artworkUrl: 1, assetUrl: 1, playbackUrl: 1,
        playbackCount: 1, streamCount: 1, genres: 1,
        contractAddress: 1, tokenId: 1,
        profileId: 1, createdAt: 1,
      })
      .toArray()

    const totalCount = await db.collection('tracks').estimatedDocumentCount()

    return res.status(200).json({
      tracks: tracks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        artist: t.artist,
        album: t.album,
        artworkUrl: t.artworkUrl,
        audioUrl: t.playbackUrl || t.assetUrl,
        playbackUrl: t.playbackUrl || t.assetUrl,
        streamCount: t.streamCount || t.playbackCount || 0,
        genres: t.genres || [],
        isNft: !!t.contractAddress,
        createdAt: t.createdAt,
      })),
      totalCount,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
