/**
 * POST /api/admin/delete-tracks — Vercel-direct (Phase 7g.2)
 * Body: { trackIds: string[], adminKey: string }
 *
 * Admin soft-delete batch. Admin key gate (no owner check). Direct Mongo
 * updateMany — SCID + IPFS data preserved for blockchain integrity.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const ADMIN_KEY = process.env.ADMIN_DELETE_KEY || 'soundchain-admin-2026'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { trackIds, adminKey } = req.body || {}
  if (adminKey !== ADMIN_KEY) return res.status(401).json({ error: 'Invalid admin key' })
  if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
    return res.status(400).json({ error: 'trackIds array is required' })
  }

  const results: { trackId: string; success: boolean; title?: string; error?: string }[] = []

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    for (const trackId of trackIds) {
      let oid: ObjectId
      try { oid = new ObjectId(trackId) } catch {
        results.push({ trackId, success: false, error: 'Invalid trackId' })
        continue
      }
      const existing = await db.collection('tracks').findOne({ _id: oid }, { projection: { title: 1 } as any })
      if (!existing) {
        results.push({ trackId, success: false, error: 'Not found' })
        continue
      }
      await db.collection('tracks').updateOne(
        { _id: oid },
        { $set: { deleted: true, deletedAt: new Date(), updatedAt: new Date() } }
      )
      results.push({ trackId, success: true, title: existing.title || '' })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message, results })
  }

  const successCount = results.filter(r => r.success).length
  return res.status(200).json({
    success: successCount > 0,
    message: `Deleted ${successCount}/${trackIds.length} tracks`,
    results,
  })
}
