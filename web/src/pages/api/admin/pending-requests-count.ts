/**
 * GET /api/admin/pending-requests-count — Vercel-direct (Phase 7e)
 * Returns count of PENDING profile verification requests for admin badge.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ count: 0 })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const count = await db.collection('profileverificationrequests').estimatedDocumentCount()
    // Exact pending count
    const pending = await db.collection('profileverificationrequests')
      .countDocuments({ status: 'PENDING' })
    return res.status(200).json({ count: pending, total: count })
  } catch (err: any) {
    return res.status(200).json({ count: 0 })
  }
}
