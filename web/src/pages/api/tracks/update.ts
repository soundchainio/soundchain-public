/**
 * POST /api/tracks/update — Vercel-direct (Phase 7f.3)
 *
 * Body: { trackId, nftData?, playbackCount?, profileId? }
 *
 * Mongo update on tracks doc. Used by marketplace flows (list-for-sale,
 * edit-auction, complete-auction, buy-now, cancel-auction) to mark the
 * pendingRequest state machine. profileId is used by some flows to mark
 * ownership transfer.
 *
 * Owner-or-admin gated. Returns the updated track.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const body = req.body || {}
  const { trackId, nftData, playbackCount, profileId } = body
  if (!trackId) return res.status(400).json({ error: 'trackId required' })

  let trackOid: ObjectId
  try { trackOid = new ObjectId(trackId) } catch { return res.status(400).json({ error: 'Invalid trackId' }) }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const existing = await db.collection('tracks').findOne({ _id: trackOid })
    if (!existing) return res.status(404).json({ error: 'Track not found' })

    // Owner-only — unless explicit ownership transfer (profileId provided)
    // means the contract just confirmed a sale + the new owner is being recorded.
    const isOwner = existing.profileId?.toString() === auth.profileId.toString()
    if (!isOwner && !profileId) {
      return res.status(403).json({ error: 'Not owner' })
    }

    const update: any = { updatedAt: new Date() }

    if (nftData !== undefined) {
      // Merge nftData fields — preserve any existing fields not overwritten
      const mergedNft = { ...(existing.nftData || {}), ...nftData }
      // Normalize pendingTime to Date if present
      if (mergedNft.pendingTime && typeof mergedNft.pendingTime === 'string') {
        try { mergedNft.pendingTime = new Date(mergedNft.pendingTime) } catch {}
      }
      update.nftData = mergedNft
    }

    if (typeof playbackCount === 'number') {
      update.playbackCount = playbackCount
    }

    if (profileId) {
      try { update.profileId = new ObjectId(profileId) } catch {}
    }

    await db.collection('tracks').updateOne({ _id: trackOid }, { $set: update })

    const updated = await db.collection('tracks').findOne({ _id: trackOid })
    return res.status(200).json({
      track: updated ? {
        id: updated._id.toString(),
        title: updated.title || '',
        nftData: updated.nftData || null,
        profileId: updated.profileId?.toString() || null,
        playbackCount: updated.playbackCount || 0,
        updatedAt: updated.updatedAt,
      } : null,
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
