/**
 * POST /api/tracks/update-edition — Vercel-direct (Phase 7f.6)
 * Bulk-update tracks in an edition (used for marketplace listing flows
 * where one edition contains many individual NFTs and they all need
 * pendingRequest flipped at once).
 *
 * Body: { trackEditionId, trackIds: string[], owner, nftData }
 * Returns { tracks: [{ id, nftData, trackEdition }] }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { trackEditionId, trackIds, owner, nftData } = req.body || {}
  if (!trackEditionId) return res.status(400).json({ error: 'trackEditionId required' })
  if (!Array.isArray(trackIds) || trackIds.length === 0) return res.status(400).json({ error: 'trackIds array required' })

  let editionOid: ObjectId
  try { editionOid = new ObjectId(trackEditionId) } catch { return res.status(400).json({ error: 'Invalid trackEditionId' }) }

  const trackOids: ObjectId[] = []
  for (const id of trackIds) {
    try { trackOids.push(new ObjectId(id)) } catch {}
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Build $set with merged nftData
    if (nftData) {
      const existing = await db.collection('tracks').find({ _id: { $in: trackOids } }).toArray()
      for (const t of existing) {
        const merged = { ...(t.nftData || {}), ...nftData }
        if (merged.pendingTime && typeof merged.pendingTime === 'string') {
          try { merged.pendingTime = new Date(merged.pendingTime) } catch {}
        }
        await db.collection('tracks').updateOne(
          { _id: t._id },
          { $set: { nftData: merged, updatedAt: new Date() } }
        )
      }
    }

    const updated = await db.collection('tracks').find({ _id: { $in: trackOids } }).toArray()
    return res.status(200).json({
      tracks: updated.map(t => ({
        id: t._id.toString(),
        nftData: t.nftData || null,
        trackEdition: t.trackEditionId ? { id: t.trackEditionId.toString() } : null,
      })),
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
