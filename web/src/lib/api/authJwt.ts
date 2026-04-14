/**
 * Shared JWT auth helper for Vercel direct API routes (Phase 4).
 * Extracts JWT from Authorization header or `token` cookie, verifies,
 * and returns { userId, profileId } — or null if unauthenticated.
 */

import type { NextApiRequest } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const JWT_SECRET = process.env.JWT_SECRET || ''

export interface AuthedUser {
  userId: string
  profileId: ObjectId
}

export async function authFromRequest(req: NextApiRequest): Promise<AuthedUser | null> {
  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  else if (req.cookies?.token) token = req.cookies.token
  if (!token) return null

  let userId: string
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    userId = decoded.sub
    if (!userId) return null
  } catch {
    return null
  }

  const client = await clientPromise
  const db = client.db('soundchain')
  const user = await db
    .collection('users')
    .findOne({ _id: new ObjectId(userId) }, { projection: { profileId: 1 } })
  if (!user?.profileId) return null

  return { userId, profileId: user.profileId as ObjectId }
}
