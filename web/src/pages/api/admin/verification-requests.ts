/**
 * GET /api/admin/verification-requests — Vercel-direct (Phase 7e)
 * Lists profile verification requests (admin-gated).
 *
 * ?status=PENDING|APPROVED|REJECTED&limit=20&cursor=xxx
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const auth = await authFromRequest(req)
  if (!auth) return res.status(200).json({ nodes: [] })

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const cursor = req.query.cursor as string
  const status = req.query.status as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const filter: any = {}
    if (status) filter.status = status
    if (cursor) {
      try { filter._id = { $lt: new ObjectId(cursor) } } catch {}
    }

    const requests = await db.collection('profileverificationrequests')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray()

    const hasNextPage = requests.length > limit
    if (hasNextPage) requests.pop()

    const nodes = requests.map(r => ({
      id: r._id.toString(),
      profileId: r.profileId?.toString() || null,
      status: r.status || 'PENDING',
      reason: r.reason || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt || r.createdAt,
    }))

    return res.status(200).json({
      nodes,
      pageInfo: {
        hasNextPage,
        endCursor: requests.length > 0 ? requests[requests.length - 1]._id.toString() : null,
        totalCount: nodes.length,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
