/**
 * POST /api/billboards/impression — Vercel-direct (Phase 7g)
 * Body: { billboardId }
 * Increments impressions counter atomically.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { billboardId } = req.body || {}
  if (!billboardId) return res.status(400).json({ error: 'billboardId required' })
  let oid: ObjectId
  try { oid = new ObjectId(billboardId) } catch { return res.status(400).json({ error: 'Invalid billboardId' }) }
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    await db.collection('billboards').updateOne({ _id: oid }, { $inc: { impressions: 1 } })
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
