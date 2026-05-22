/**
 * POST /api/whitelist/create — Vercel-direct (Phase 7f.5)
 *
 * Body: { walletAddress, emailAddress }
 * Idempotent upsert into whitelistentries collection.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { walletAddress, emailAddress } = req.body || {}
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const wa = String(walletAddress).toLowerCase()
    const result = await db.collection('whitelistentries').findOneAndUpdate(
      { walletAddress: wa },
      {
        $setOnInsert: { walletAddress: wa, createdAt: new Date() },
        $set: { emailAddress: emailAddress || '', updatedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    )
    const id = (result?.value?._id || (result as any)?._id || '').toString()
    return res.status(200).json({ whitelistEntry: { id } })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
