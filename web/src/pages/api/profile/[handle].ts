/**
 * GET /api/profile/[handle] — Look up a profile by user handle.
 *
 * Resolution order (handles legacy + new schema + ObjectId fallback so the
 * avatar-tap → /users/{handle|id} flow always lands somewhere):
 *   1) users.handle (case-insensitive) → users.profileId → profiles
 *   2) profiles.userHandle / profiles.displayName direct match (case-insensitive)
 *   3) profiles._id when handle is a 24-char ObjectId
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const handle = (req.query.handle as string || '').trim()
  if (!handle) return res.status(400).json({ error: 'handle required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const handleRegex = new RegExp(`^${escaped}$`, 'i')

    let profile: any = null

    // 1) users.handle → profiles
    const user = await db.collection('users').findOne({ handle: handleRegex })
    if (user?.profileId) {
      profile = await db.collection('profiles').findOne({ _id: user.profileId })
    }

    // 2) Direct match on profiles.userHandle / displayName
    if (!profile) {
      profile = await db.collection('profiles').findOne({
        $or: [
          { userHandle: handleRegex },
          { displayName: handleRegex },
        ],
      })
    }

    // 3) ObjectId fallback (avatar Link falls back to profile.id when userHandle is empty)
    if (!profile && /^[0-9a-fA-F]{24}$/.test(handle)) {
      try {
        profile = await db.collection('profiles').findOne({ _id: new ObjectId(handle) })
      } catch {}
    }

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
        tracksCount: profile.tracksCount || 0,
        isVerified: profile.isVerified || false,
        verified: profile.verified || false,
        teamMember: profile.teamMember || false,
        badges: profile.badges || [],
        featuredTrackId: profile.featuredTrackId || '',
        featuredAudioUrl: profile.featuredAudioUrl || '',
        featuredAudioTitle: profile.featuredAudioTitle || '',
        featuredAudioArtist: profile.featuredAudioArtist || '',
        featuredAudioCoverUrl: profile.featuredAudioCoverUrl || '',
        wallAudioPlaylist: profile.wallAudioPlaylist || [],
        socialMedias: profile.socialMedias || {},
        favoriteGenres: profile.favoriteGenres || [],
        musicianTypes: profile.musicianTypes || [],
        topFriends: profile.topFriends || [],
        profileViewCount: profile.profileViewCount || 0,
        magicWalletAddress: profile.magicWalletAddress || '',
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
