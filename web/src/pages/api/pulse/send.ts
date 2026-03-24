import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'

function getAuthProfile(req: NextApiRequest): { userId: string; profileId: string; handle: string } | null {
  let token = ''
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7)
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
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

  const { toId, message } = req.body

  if (!toId || typeof toId !== 'string') {
    return res.status(400).json({ error: 'toId is required' })
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const messages = db.collection('messages')

    // Resolve profileId from userId if not in JWT (agent tokens)
    const profileId = await resolveProfileId(auth, db)
    if (!profileId) {
      return res.status(401).json({ error: 'Profile not found for user' })
    }

    if (toId === profileId) {
      return res.status(400).json({ error: 'Cannot send a message to yourself' })
    }

    const now = new Date()

    const doc = {
      message: message.trim(),
      fromId: (() => { try { return new ObjectId(profileId) } catch { return profileId } })(),
      toId: (() => { try { return new (require('mongodb').ObjectId)(toId) } catch { return toId } })(),
      createdAt: now,
      updatedAt: now,
      readAt: null,
    }

    const result = await messages.insertOne(doc)

    return res.status(201).json({
      message: {
        id: result.insertedId.toString(),
        message: doc.message,
        fromId: doc.fromId,
        toId: doc.toId,
        createdAt: doc.createdAt.toISOString(),
        readAt: null,
      },
    })
  } catch (error: any) {
    console.error('Pulse send error:', error)
    return res.status(500).json({ error: error.message || 'Failed to send message' })
  }
}
