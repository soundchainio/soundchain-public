/**
 * GET /api/billboards/slot?slot=FEED_TOP|SIDEBAR_1|... — Vercel-direct (Phase 7g)
 *
 * Returns the active billboard for a given slot.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const slot = req.query.slot as string
  if (!slot) return res.status(400).json({ error: 'slot required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const now = new Date()
    const b: any = await db.collection('billboards').findOne({
      slot,
      active: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
    }, { sort: { createdAt: -1 } })

    if (!b) return res.status(200).json({ billboard: null })

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({
      billboard: {
        id: b._id.toString(),
        title: b.title || '',
        description: b.description || '',
        imageUrl: b.imageUrl || '',
        linkUrl: b.linkUrl || '',
        profileId: b.profileId?.toString() || null,
        expiresAt: b.expiresAt || null,
        impressions: b.impressions || 0,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
