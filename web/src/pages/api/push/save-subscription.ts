/**
 * POST /api/push/save-subscription — Save push subscription from resubscribe page
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'POST or DELETE only' })

  const { endpoint, keys, device, deviceName, userAgent } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
  if (req.method === 'POST' && !keys) return res.status(400).json({ error: 'keys required' })

  // Get user from JWT
  let token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token || ''
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const userId = decoded.sub
    const profileId = decoded[`${JWT_NAMESPACE}/profileId`] || ''

    const client = await clientPromise
    const db = client.db('soundchain')

    if (req.method === 'DELETE') {
      await db.collection('pushsubscriptions').deleteMany({ endpoint, userId })
      return res.status(200).json({ success: true })
    }

    // Remove old subscriptions for this endpoint
    await db.collection('pushsubscriptions').deleteMany({ endpoint })

    // Save new subscription
    await db.collection('pushsubscriptions').insertOne({
      userId,
      profileId,
      endpoint,
      keys,
      device: device || deviceName || 'Unknown',
      userAgent: userAgent || '',
      createdAt: new Date(),
    })

    return res.status(200).json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
