/**
 * GET /api/announcements - Public announcements feed
 * Replaces direct Lambda /v1/feed calls with Atlas query
 * Query params: limit (max 50, default 20), offset (default 0)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
    const offset = parseInt(req.query.offset as string) || 0

    const client = await clientPromise
    const db = client.db('soundchain')

    const query = {
      status: 'APPROVED',
      $or: [
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
        { scheduledFor: { $lte: new Date() } },
      ],
    }

    const [announcements, total] = await Promise.all([
      db.collection('announcements')
        .find(query)
        .sort({ featured: -1, publishedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      db.collection('announcements').countDocuments(query),
    ])

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

    return res.status(200).json({
      announcements: announcements.map(a => ({
        id: a._id,
        title: a.title,
        content: a.content,
        link: a.link,
        imageUrl: a.imageUrl,
        type: a.type,
        tags: a.tags,
        companyName: a.companyName,
        companyLogo: a.companyLogo,
        featured: a.featured,
        viewCount: a.viewCount,
        publishedAt: a.publishedAt,
      })),
      pagination: { total, limit, offset, hasMore: offset + announcements.length < total },
    })
  } catch (err) {
    console.error('[Announcements API] Error:', err)
    return res.status(500).json({ error: 'Failed to fetch announcements' })
  }
}
