import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// Fields that go on the PROFILES collection
const PROFILE_FIELDS = new Set([
  'bio', 'displayName', 'profilePicture', 'coverImage', 'coverPicture',
  'userHandle', 'favoriteGenres', 'musicianTypes', 'socialLinks',
  'socialMedias', 'featuredTrackId', 'featuredAudioUrl', 'featuredAudioTitle',
  'featuredAudioArtist', 'featuredAudioCoverUrl', 'wallAudioPlaylist',
  'topFriends', 'pinnedPostId',
])

// Fields that go on the USERS collection (handle is special; notification
// settings live on the user doc — NotificationSettingsForm, Phase 7f migration
// off the dead Apollo UPDATE_NOTIFICATION_SETTINGS mutation).
const USER_FIELDS = new Set([
  'handle',
  'notifyOnFollow', 'notifyOnLike', 'notifyOnComment', 'notifyOnSale',
  'notifyOnTip', 'notifyOnDM', 'notifyViaNostr',
])

// POST { fields: { [fieldName]: value, ... } }
// Handles both profile + user collection updates in one call
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { fields } = req.body || {}
  if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'fields object required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Split fields between profile and user collections
    const profileUpdate: any = { updatedAt: new Date() }
    const userUpdate: any = {}

    for (const [k, v] of Object.entries(fields)) {
      if (PROFILE_FIELDS.has(k)) profileUpdate[k] = v
      if (USER_FIELDS.has(k)) userUpdate[k] = v
    }

    // Handle uniqueness check (if changing handle)
    if (userUpdate.handle) {
      const existing = await db.collection('users').findOne({
        handle: { $regex: `^${userUpdate.handle}$`, $options: 'i' },
        _id: { $ne: new ObjectId(auth.userId) },
      })
      if (existing) return res.status(409).json({ error: 'Handle already taken' })
      // Also update userHandle on profile for consistency
      profileUpdate.userHandle = userUpdate.handle
    }

    // Update profile collection
    if (Object.keys(profileUpdate).length > 1) {
      await db.collection('profiles').updateOne({ _id: auth.profileId }, { $set: profileUpdate })
    }

    // Update user collection (handle)
    if (Object.keys(userUpdate).length > 0) {
      await db.collection('users').updateOne({ _id: new ObjectId(auth.userId) }, { $set: { ...userUpdate, updatedAt: new Date() } })
    }

    const profile = await db.collection('profiles').findOne({ _id: auth.profileId })
    return res.status(200).json({
      profile: profile ? { ...profile, id: profile._id.toString(), _id: undefined } : null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
