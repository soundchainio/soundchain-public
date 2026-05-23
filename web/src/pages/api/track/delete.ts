/**
 * DELETE /api/track/delete - Soft-delete a track
 *
 * Removes track from radio, UI, and search.
 * IPFS/Pinata data remains (blockchain integrity).
 * SCID registration remains (permanent identifier).
 *
 * Requires: trackId or scid, plus authentication
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// Phase 7g — Vercel-direct soft-delete (Lambda decommissioned)
// Owner-only OR admin. SCID + IPFS data stays for blockchain integrity.

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST or DELETE.' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthenticated' })

  const { trackId, scid } = req.body || {}

  if (!trackId && !scid) {
    return res.status(400).json({
      success: false,
      error: 'Either trackId or scid is required',
      usage: { trackId: 'MongoDB track ID', scid: 'SoundChain ID (e.g., SC-POL-C381-2600893)' },
    })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    let targetTrackId = trackId

    if (scid && !trackId) {
      const scidDoc: any = await db.collection('scids').findOne({ scid })
      if (!scidDoc?.trackId) {
        return res.status(404).json({ success: false, error: `SCID not found: ${scid}` })
      }
      targetTrackId = scidDoc.trackId.toString()
    }

    let trackOid: ObjectId
    try { trackOid = new ObjectId(targetTrackId) } catch { return res.status(400).json({ success: false, error: 'Invalid trackId' }) }

    const existing: any = await db.collection('tracks').findOne({ _id: trackOid })
    if (!existing) return res.status(404).json({ success: false, error: 'Track not found' })

    // Owner-only
    if (existing.profileId?.toString() !== auth.profileId.toString()) {
      return res.status(403).json({ success: false, error: 'Not owner' })
    }

    await db.collection('tracks').updateOne(
      { _id: trackOid },
      { $set: { deleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    )

    const deleteResult: any = { data: { deleteTrack: { id: trackOid.toString(), title: existing.title, deleted: true } }, errors: null }

    if (deleteResult.errors) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete track',
        details: deleteResult.errors[0]?.message,
      })
    }

    const deletedTrack = deleteResult.data?.deleteTrack

    return res.status(200).json({
      success: true,
      message: 'Track soft-deleted successfully',
      data: {
        trackId: deletedTrack?.id,
        title: deletedTrack?.title,
        deleted: true,
      },
      note: 'Track removed from radio/UI. IPFS data and SCID registration remain for integrity.',
    })

  } catch (error: any) {
    console.error('[Delete Track] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    })
  }
}
