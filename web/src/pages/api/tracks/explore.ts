/**
 * GET /api/tracks/explore — Vercel-direct replacement for useExploreTracksSlimQuery
 *
 * ?search=xxx — search by title or artist
 * ?genre=xxx — filter by genre
 * ?sort=popular|newest — sort order
 * ?limit=20 — pagination
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const search = req.query.search as string
  const genre = req.query.genre as string
  const sort = (req.query.sort as string) || 'popular'
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { deleted: { $ne: true } }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ title: regex }, { artist: regex }]
    }
    if (genre) {
      filter.genres = { $in: [genre] }
    }

    const sortObj: any = sort === 'newest' ? { createdAt: -1 } : { playbackCount: -1, createdAt: -1 }

    const tracks = await db.collection('tracks')
      .find(filter)
      .sort(sortObj)
      .limit(limit)
      .project({ title: 1, artist: 1, artworkUrl: 1, playbackUrl: 1, genres: 1, playbackCount: 1, favoriteCount: 1, createdAt: 1, nftData: 1, editionSize: 1 })
      .toArray()

    const nodes = tracks.map(t => ({
      id: t._id.toString(),
      title: t.title || '',
      artist: t.artist || '',
      artworkUrl: t.artworkUrl || '',
      playbackUrl: t.playbackUrl || '',
      genres: t.genres || [],
      playbackCount: t.playbackCount || 0,
      favoriteCount: t.favoriteCount || 0,
      createdAt: t.createdAt || null,
      nftData: t.nftData || null,
      editionSize: t.editionSize || null,
    }))

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res.status(200).json({ nodes })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
