/**
 * GET /api/profile/[handle] — Look up profile by userHandle or displayName
 * Direct Atlas query, bypasses Lambda GraphQL
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const handle = req.query.handle as string
  if (!handle) return res.status(400).json({ error: 'handle required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Search by userHandle first (case-insensitive), then displayName
    const profile = await db.collection('profiles').findOne({
      $or: [
        { userHandle: { $regex: new RegExp(`^${handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { displayName: { $regex: new RegExp(`^${handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      ],
    })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

    return res.status(200).json({
      profile: {
        id: profile._id.toString(),
        displayName: profile.displayName,
        userHandle: profile.userHandle,
        profilePicture: profile.profilePicture,
        coverPicture: profile.coverPicture,
        bio: profile.bio,
        followerCount: profile.followerCount || 0,
        followingCount: profile.followingCount || 0,
        isVerified: profile.isVerified || false,
        createdAt: profile.createdAt,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
