/**
 * GET /api/tracks/genres — Vercel-direct replacement for useExploreGenreCountsQuery
 *
 * Returns genre names with track counts.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 300_000 // 5 min

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(cache.data)
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const pipeline = [
      { $match: { deleted: { $ne: true }, genres: { $exists: true, $ne: [] } } },
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
      { $limit: 50 },
    ]

    const genres = await db.collection('tracks').aggregate(pipeline).toArray()

    const result = {
      genres: genres.map(g => ({ name: g._id, count: g.count })),
    }

    cache = { data: result, ts: Date.now() }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
