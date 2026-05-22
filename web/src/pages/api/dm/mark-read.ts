/**
 * POST /api/dm/mark-read — Vercel-direct (Phase 7f)
 *
 * Marks all messages from a given partner as read for the authed user.
 * Body: { fromProfileId?: string }   — if omitted, marks ALL inbound as read
 * Returns { ok: true, modifiedCount }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { fromProfileId } = req.body || {}

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const profileIds: any[] = [auth.profileId, auth.profileId.toString()]

    const filter: any = {
      toId: { $in: profileIds },
      read: { $ne: true },
    }
    if (fromProfileId) {
      try {
        const oid = new ObjectId(fromProfileId)
        filter.fromId = { $in: [oid, fromProfileId] }
      } catch {
        filter.fromId = fromProfileId
      }
    }

    const result = await db.collection('messages').updateMany(filter, { $set: { read: true, readAt: new Date() } })

    // Reset profile unread counter (best-effort)
    await db.collection('profiles').updateOne({ _id: auth.profileId }, { $set: { unreadMessageCount: 0 } })

    return res.status(200).json({ ok: true, modifiedCount: result.modifiedCount })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
