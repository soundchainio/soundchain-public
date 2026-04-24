/**
 * GET /api/tracks/scid — Vercel-direct replacement for SCID_BY_TRACK_QUERY
 *
 * ?trackId=xxx — get SCid data for a track
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const trackId = req.query.trackId as string
  if (!trackId) return res.status(400).json({ error: 'trackId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const scid = await db.collection('scids').findOne({ trackId: new ObjectId(trackId) })
    if (!scid) return res.status(200).json({ scidByTrack: null })

    return res.status(200).json({
      scidByTrack: {
        id: scid._id.toString(),
        scidCode: scid.scidCode || '',
        trackId: scid.trackId?.toString() || '',
        profileId: scid.profileId?.toString() || '',
        streamCount: scid.streamCount || 0,
        ogunEarned: scid.ogunEarned || 0,
        ipfsCid: scid.ipfsCid || '',
        playbackUrl: scid.playbackUrl || '',
        isNft: scid.isNft || false,
        tokenId: scid.tokenId ?? null,
        createdAt: scid.createdAt || null,
        streamCountCalibratedAt: scid.streamCountCalibratedAt || null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
