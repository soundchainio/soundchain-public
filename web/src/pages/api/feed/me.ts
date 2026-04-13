/**
 * GET /api/feed/me
 *
 * PHASE 3: Vercel direct "me" query — bypasses Lambda.
 * Returns current user data from JWT token.
 *
 * Headers: Authorization: Bearer <jwt>
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  // Extract JWT from Authorization header or cookie
  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }

  if (!token) return res.status(401).json({ error: 'No token' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.sub
    if (!userId) return res.status(401).json({ error: 'Invalid token' })

    const client = await clientPromise
    const db = client.db('soundchain')

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) return res.status(404).json({ error: 'User not found' })

    let profile = null
    if (user.profileId) {
      profile = await db.collection('profiles').findOne({ _id: user.profileId })
    }

    return res.status(200).json({
      me: {
        id: user._id.toString(),
        handle: user.handle,
        email: user.email,
        hdWalletAddress: user.hdWalletAddress,
        magicWalletAddress: user.magicWalletAddress,
        googleWalletAddress: user.googleWalletAddress,
        authMethod: user.authMethod,
        roles: user.roles || [],
        profile: profile ? {
          id: profile._id.toString(),
          displayName: profile.displayName,
          profilePicture: profile.profilePicture,
          userHandle: profile.userHandle,
          bio: profile.bio,
          followerCount: profile.followerCount || 0,
          followingCount: profile.followingCount || 0,
          verified: profile.verified || false,
          badges: profile.badges || [],
        } : null,
      },
    })
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    return res.status(500).json({ error: err.message })
  }
}
