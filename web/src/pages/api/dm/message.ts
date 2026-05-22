/**
 * GET /api/dm/message?id=<messageId> — Vercel-direct (Phase 7e)
 * Returns a single DM message by id w/ sender profile hydration.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'id required' })
  let oid: ObjectId
  try { oid = new ObjectId(id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const m: any = await db.collection('messages').findOne({ _id: oid })
    if (!m) return res.status(404).json({ error: 'Not found' })

    let fromProfile: any = null
    if (m.fromId) {
      try {
        const pid = typeof m.fromId === 'string' ? new ObjectId(m.fromId) : m.fromId
        fromProfile = await db.collection('profiles')
          .findOne({ _id: pid }, { projection: { displayName: 1, profilePicture: 1, userHandle: 1 } as any })
      } catch {}
    }

    return res.status(200).json({
      message: {
        id: m._id.toString(),
        body: m.body || m.message || '',
        message: m.body || m.message || '',
        fromId: m.fromId?.toString() || null,
        toId: m.toId?.toString() || null,
        createdAt: m.createdAt,
        read: !!m.read,
        profile: fromProfile ? {
          id: fromProfile._id.toString(),
          displayName: fromProfile.displayName || '',
          userHandle: fromProfile.userHandle || '',
          profilePicture: fromProfile.profilePicture || null,
        } : null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
