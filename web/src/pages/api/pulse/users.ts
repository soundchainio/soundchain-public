import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'

function getAuthProfile(req: NextApiRequest): { userId: string; profileId: string; handle: string } | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any
    return {
      userId: decoded.sub,
      profileId: decoded[`${JWT_NAMESPACE}/profileId`],
      handle: decoded[`${JWT_NAMESPACE}/handle`],
    }
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = getAuthProfile(req)
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const profiles = db.collection('profiles')

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const skip = parseInt(req.query.skip as string) || 0

    const userProfiles = await profiles
      .find({
        _id: { $ne: auth.profileId as any },
      })
      .project({
        _id: 1,
        displayName: 1,
        userHandle: 1,
        profilePicture: 1,
        followerCount: 1,
        verified: 1,
      })
      .sort({ followerCount: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const users = userProfiles.map((p) => ({
      id: p._id.toString(),
      displayName: p.displayName || '',
      handle: p.userHandle || '',
      profilePicture: p.profilePicture || null,
      followerCount: p.followerCount || 0,
      verified: p.verified || false,
    }))

    return res.status(200).json({ users })
  } catch (error: any) {
    console.error('Pulse users error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch users' })
  }
}
