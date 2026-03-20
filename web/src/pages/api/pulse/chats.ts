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
    const messages = db.collection('messages')
    const profiles = db.collection('profiles')

    // Find all messages where the authenticated user is sender or recipient
    // Group by conversation partner, get the latest message per chat
    const pipeline = [
      {
        $match: {
          $or: [
            { from: auth.profileId },
            { to: auth.profileId },
          ],
        },
      },
      {
        $addFields: {
          partnerId: {
            $cond: {
              if: { $eq: ['$from', auth.profileId] },
              then: '$to',
              else: '$from',
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 as const },
      },
      {
        $group: {
          _id: '$partnerId',
          message: { $first: '$message' },
          from: { $first: '$from' },
          createdAt: { $first: '$createdAt' },
          readAt: { $first: '$readAt' },
          messageId: { $first: '$_id' },
        },
      },
      {
        $sort: { createdAt: -1 as const },
      },
      {
        $limit: 50,
      },
    ]

    const chatDocs = await messages.aggregate(pipeline).toArray()

    // Fetch profile info for each conversation partner
    const partnerIds = chatDocs.map((c) => {
      try {
        return new ObjectId(c._id)
      } catch {
        return c._id
      }
    })

    const partnerProfiles = await profiles
      .find({ _id: { $in: partnerIds } })
      .project({ _id: 1, displayName: 1, userHandle: 1, profilePicture: 1 })
      .toArray()

    const profileMap = new Map(
      partnerProfiles.map((p) => [p._id.toString(), p])
    )

    const chats = chatDocs.map((chat) => {
      const profile = profileMap.get(chat._id?.toString()) || {}
      const isUnread = chat.from !== auth.profileId && !chat.readAt
      return {
        id: chat.messageId?.toString(),
        message: chat.message,
        unread: isUnread,
        createdAt: chat.createdAt,
        fromId: chat.from,
        profile: {
          id: chat._id?.toString(),
          displayName: (profile as any).displayName || 'Unknown',
          userHandle: (profile as any).userHandle || '',
          profilePicture: (profile as any).profilePicture || null,
        },
      }
    })

    return res.status(200).json({ chats })
  } catch (error: any) {
    console.error('Pulse chats error:', error)
    return res.status(500).json({ error: error.message || 'Failed to fetch chats' })
  }
}
