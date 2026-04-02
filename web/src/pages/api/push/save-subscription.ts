/**
 * POST /api/push/save-subscription — Save push subscription from resubscribe page
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { endpoint, keys, device } = req.body
  if (!endpoint || !keys) return res.status(400).json({ error: 'endpoint and keys required' })

  // Get user from JWT
  let token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token || ''
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.sub
    const profileId = decoded[`${JWT_NAMESPACE}/profileId`] || ''

    const client = await clientPromise
    const db = client.db('soundchain')

    // Remove old subscriptions for this endpoint
    await db.collection('pushsubscriptions').deleteMany({ endpoint })

    // Save new subscription
    await db.collection('pushsubscriptions').insertOne({
      userId,
      profileId,
      endpoint,
      keys,
      device: device || 'Unknown',
      createdAt: new Date(),
    })

    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
