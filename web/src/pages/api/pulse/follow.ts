import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'

function getAuthProfile(req: NextApiRequest): { userId: string; profileId: string; handle: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any
    return {
      userId: decoded.sub,
      profileId: decoded[`${JWT_NAMESPACE}/profileId`] || '',
      handle: decoded[`${JWT_NAMESPACE}/handle`] || '',
    }
  } catch {
    return null
  }
}

async function resolveProfileId(auth: { userId: string; profileId: string }, db: any): Promise<string> {
  if (auth.profileId) return auth.profileId
  const profiles = db.collection('profiles')
  const profile = await profiles.findOne({ userId: auth.userId })
    || await profiles.findOne({ userId: new ObjectId(auth.userId) })
  return profile?._id?.toString() || ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = getAuthProfile(req)
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { profileId } = req.body

  if (!profileId || typeof profileId !== 'string') {
    return res.status(400).json({ error: 'profileId is required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const follows = db.collection('follows')
    const profiles = db.collection('profiles')

    // Resolve profileId from userId if not in JWT (agent tokens)
    const myProfileId = await resolveProfileId(auth, db)
    if (!myProfileId) {
      return res.status(401).json({ error: 'Profile not found for user' })
    }

    if (profileId === myProfileId) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }

    // Verify target profile exists
    let targetProfile
    try {
      targetProfile = await profiles.findOne({ _id: new ObjectId(profileId) })
    } catch {
      targetProfile = await profiles.findOne({ _id: profileId as any })
    }

    if (!targetProfile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    // Upsert to prevent duplicate follows
    // Use "followedId" to match Mongoose Follow model (not "followingId")
    const now = new Date()
    const result = await follows.updateOne(
      {
        followerId: myProfileId,
        followedId: profileId,
      },
      {
        $setOnInsert: {
          followerId: myProfileId,
          followedId: profileId,
          createdAt: now,
        },
        $set: {
          updatedAt: now,
        },
      },
      { upsert: true }
    )

    // Only increment counts if a NEW follow was created (not a duplicate)
    if (result.upsertedCount > 0) {
      await Promise.all([
        profiles.updateOne(
          { _id: new ObjectId(profileId) },
          { $inc: { followerCount: 1 } }
        ),
        profiles.updateOne(
          { _id: new ObjectId(myProfileId) },
          { $inc: { followingCount: 1 } }
        ),
      ]).catch(() => {
        // Non-critical: counts may be slightly off but follow is saved
      })
    }

    return res.status(200).json({
      success: true,
      followerId: myProfileId,
      followingId: profileId,
    })
  } catch (error: any) {
    console.error('Pulse follow error:', error)
    return res.status(500).json({ error: error.message || 'Failed to follow user' })
  }
}
