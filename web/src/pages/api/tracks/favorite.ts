/**
 * POST /api/tracks/favorite { trackId }
 *
 * Toggle favorite on a track for the authed profile. Idempotent via
 * upsert/delete semantics — returns the new favorite state.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { trackId } = req.body || {}
  if (!trackId) return res.status(400).json({ error: 'trackId required' })

  let trackOid: ObjectId
  try { trackOid = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'Invalid trackId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const favs = db.collection('favorites')
    const tracks = db.collection('tracks')

    const existing = await favs.findOne({ profileId: auth.profileId, trackId: trackOid })
    if (existing) {
      await favs.deleteOne({ _id: existing._id })
      await tracks.updateOne({ _id: trackOid, favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } })
      return res.status(200).json({ ok: true, isFavorite: false })
    }
    await favs.insertOne({ profileId: auth.profileId, trackId: trackOid, createdAt: new Date() })
    await tracks.updateOne({ _id: trackOid }, { $inc: { favoriteCount: 1 } })
    return res.status(200).json({ ok: true, isFavorite: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
