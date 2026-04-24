/**
 * GET /api/notifications/list — Vercel-direct replacement for useNotificationsQuery
 *
 * ?limit=20&cursor=xxx — pagination
 * Returns notifications for the authenticated user.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ nodes: [], pageInfo: { hasNextPage: false, totalCount: 0 } })

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = { recipientProfileId: auth.profileId }
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray()

    const hasNextPage = notifications.length > limit
    if (hasNextPage) notifications.pop()

    // Hydrate sender profiles
    const senderIds = [...new Set(notifications.map(n => n.senderProfileId?.toString()).filter(Boolean))]
    const senderOids = senderIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean) as ObjectId[]
    const senders = senderOids.length > 0
      ? await db.collection('profiles').find({ _id: { $in: senderOids } }).project({ displayName: 1, userHandle: 1, profilePicture: 1 }).toArray()
      : []
    const senderMap = new Map(senders.map(s => [s._id.toString(), s]))

    const nodes = notifications.map(n => {
      const sender = senderMap.get(n.senderProfileId?.toString())
      return {
        id: n._id.toString(),
        type: n.type || 'general',
        message: n.message || '',
        read: n.read || false,
        createdAt: n.createdAt || null,
        postId: n.postId?.toString() || null,
        trackId: n.trackId?.toString() || null,
        senderProfile: sender ? {
          id: sender._id.toString(),
          displayName: sender.displayName || '',
          userHandle: sender.userHandle || '',
          profilePicture: sender.profilePicture || null,
        } : null,
      }
    })

    return res.status(200).json({
      nodes,
      pageInfo: { hasNextPage, endCursor: notifications.length > 0 ? notifications[notifications.length - 1]._id.toString() : null, totalCount: nodes.length },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
