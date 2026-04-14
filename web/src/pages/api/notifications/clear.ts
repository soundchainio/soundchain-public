import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// POST (no body) — clears all notifications for authed user
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const result = await db.collection('notifications').updateMany(
      { toProfileId: auth.profileId, read: { $ne: true } },
      { $set: { read: true, updatedAt: new Date() } },
    )
    return res.status(200).json({ ok: true, updated: result.modifiedCount })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
