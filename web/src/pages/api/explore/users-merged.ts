/**
 * Merged Users API — all users now live in Atlas (migrated from DocumentDB Mar 19, 2026)
 *
 * GET /api/explore/users-merged?search=&limit=200&skip=0
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 200, 500)
  const skip = parseInt(req.query.skip as string) || 0
  const search = (req.query.search as string)?.trim() || ''

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = {}
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { userHandle: { $regex: search, $options: 'i' } },
      ]
    }

    const totalCount = await db.collection('profiles').countDocuments(filter)

    const profiles = await db
      .collection('profiles')
      .find(filter)
      .project({
        _id: 1,
        displayName: 1,
        userHandle: 1,
        profilePicture: 1,
        followerCount: 1,
        verified: 1,
        favoriteGenres: 1,
        createdAt: 1,
        badges: 1,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const nodes = profiles.map((p) => ({
      id: p._id.toString(),
      displayName: p.displayName || p.userHandle || '',
      profilePicture: p.profilePicture || null,
      userHandle: p.userHandle || '',
      verified: p.verified || false,
      followerCount: p.followerCount || 0,
      favoriteGenres: p.favoriteGenres || [],
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      badges: p.badges || [],
      source: 'atlas',
    }))

    return res.status(200).json({
      nodes,
      pageInfo: {
        totalCount,
        hasNextPage: skip + limit < totalCount,
        skip,
        limit,
      },
    })
  } catch (error: any) {
    console.error('Merged users error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch users' })
  }
}
