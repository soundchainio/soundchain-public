/**
 * GET /api/feed/profile
 *
 * PHASE 3: Vercel direct profile fetch — bypasses Lambda.
 *
 * Query params:
 *   ?handle=xxx — fetch by userHandle
 *   ?id=xxx — fetch by profile ID
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  const handle = req.query.handle as string
  const id = req.query.id as string

  if (!handle && !id) return res.status(400).json({ error: 'handle or id required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    let profile: any = null

    if (handle) {
      // Find user by handle, then get profile
      const user = await db.collection('users').findOne({
        handle: { $regex: new RegExp(`^${handle}$`, 'i') }
      })
      if (user?.profileId) {
        profile = await db.collection('profiles').findOne({ _id: user.profileId })
      }
      // Also try direct handle match on profiles
      if (!profile) {
        profile = await db.collection('profiles').findOne({
          userHandle: { $regex: new RegExp(`^${handle}$`, 'i') }
        })
      }
    } else if (id) {
      try {
        profile = await db.collection('profiles').findOne({ _id: new ObjectId(id) })
      } catch {}
    }

    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    return res.status(200).json({
      profile: {
        id: profile._id.toString(),
        displayName: profile.displayName,
        profilePicture: profile.profilePicture,
        coverPicture: profile.coverPicture,
        bio: profile.bio,
        userHandle: profile.userHandle,
        followerCount: profile.followerCount || 0,
        followingCount: profile.followingCount || 0,
        tracksCount: profile.tracksCount || 0,
        verified: profile.verified || false,
        teamMember: profile.teamMember || false,
        badges: profile.badges || [],
        favoriteGenres: profile.favoriteGenres || [],
        socialMedias: profile.socialMedias || {},
        profileViewCount: profile.profileViewCount || 0,
        createdAt: profile.createdAt,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
