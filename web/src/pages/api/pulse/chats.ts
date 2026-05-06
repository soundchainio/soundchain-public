import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// Auth via canonical `authFromRequest` (looks up users.profileId by userId).
// The previous inline `getAuthProfile` looked up profiles.findOne({userId}) which
// silently returns null for accounts where the profiles doc lacks a `userId`
// back-pointer — the resulting 401 surfaces as "No conversations yet" empty UI
// because pulse.tsx didn't check r.ok on the fetch. May 6 2026 fix.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await authFromRequest(req)
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const messages = db.collection('messages')
    const profiles = db.collection('profiles')

    const profileId = auth.profileId.toString()

    // Convert profileId string to ObjectId for matching. Defensive: also keep the string form
    // because legacy Apollo/Lambda-era messages stored fromId/toId as strings, while new
    // Vercel-direct messages store ObjectId. $in across both shapes catches everything.
    let profileOid: any
    try { profileOid = new ObjectId(profileId) } catch { profileOid = profileId }
    const profileStr = profileId.toString()
    const profileIds = [profileOid, profileStr]

    // Find all messages where the authenticated user is sender or recipient (either shape).
    // Group by conversation partner, get the latest message per chat.
    const pipeline = [
      {
        $match: {
          $or: [
            { fromId: { $in: profileIds } },
            { toId: { $in: profileIds } },
          ],
        },
      },
      {
        $addFields: {
          partnerId: {
            $cond: {
              // Use $in for the equality check too — partner is whichever id ISN'T mine.
              if: { $in: ['$fromId', profileIds] },
              then: '$toId',
              else: '$fromId',
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
          fromId: { $first: '$fromId' },
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
      const isUnread = chat.fromId?.toString() !== profileId && !chat.readAt
      return {
        id: chat.messageId?.toString(),
        message: chat.message,
        unread: isUnread,
        createdAt: chat.createdAt,
        fromId: chat.fromId?.toString(),
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
