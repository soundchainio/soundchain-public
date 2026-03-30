/**
 * Merged Users API — all users now live in Atlas (migrated from DocumentDB Mar 19, 2026)
 *
 * GET /api/explore/users-merged?search=&limit=200&skip=0
 *
 * Joins profiles + users collections to get handles for human users
 * (human profiles don't have userHandle — it lives in the users collection as 'handle')
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

    // Build aggregation to join profiles with users to get handles
    const pipeline: any[] = [
      // Join with users collection to get handle
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'profileId',
          as: 'userDoc',
        },
      },
      // Unwind (optional match — some profiles may not have a user doc)
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      // Add computed handle field
      {
        $addFields: {
          resolvedHandle: {
            $ifNull: ['$userHandle', { $ifNull: ['$userDoc.handle', ''] }],
          },
        },
      },
    ]

    // Search filter (after join so we can search by handle too)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { displayName: { $regex: search, $options: 'i' } },
            { resolvedHandle: { $regex: search, $options: 'i' } },
            { userHandle: { $regex: search, $options: 'i' } },
          ],
        },
      })
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }]
    const countResult = await db.collection('profiles').aggregate(countPipeline).toArray()
    const totalCount = countResult[0]?.total || 0

    // Get paginated results
    pipeline.push(
      { $sort: { createdAt: -1 as const } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          displayName: 1,
          userHandle: { $ifNull: ['$userHandle', '$userDoc.handle'] },
          profilePicture: 1,
          followerCount: 1,
          verified: 1,
          favoriteGenres: 1,
          createdAt: 1,
          badges: 1,
        },
      }
    )

    const profiles = await db.collection('profiles').aggregate(pipeline).toArray()

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
