/**
 * GET /api/feed/notifications
 *
 * PHASE 3: Vercel direct notification count — bypasses Lambda.
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

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')

  let token = ''
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  else if (req.cookies?.token) token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'No token' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.sub

    const client = await clientPromise
    const db = client.db('soundchain')

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user?.profileId) return res.status(200).json({ unread: 0 })

    const profile = await db.collection('profiles').findOne({ _id: user.profileId })

    return res.status(200).json({
      unread: profile?.unreadNotificationCount || 0,
      unreadMessages: profile?.unreadMessageCount || 0,
    })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
