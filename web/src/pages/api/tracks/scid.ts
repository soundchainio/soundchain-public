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

    // scids.trackId is stored as a STRING in ~all docs (5432/5433); querying by
    // ObjectId silently returns null and zeroes scid resolution + streaming rewards.
    // Match string first, ObjectId as a fallback for the lone legacy doc.
    const _ors: any[] = [{ trackId: trackId }]
    if (ObjectId.isValid(trackId)) _ors.push({ trackId: new ObjectId(trackId) })
    const scid = await db.collection('scids').findOne({ $or: _ors })
    if (!scid) return res.status(200).json({ scidByTrack: null })

    // Canonical field is `scid` per api/src/models/SCid.ts + GraphQL schema. Older
    // Vercel-direct docs (pre-bugfix May 14, 2026) stored the code under `code` and
    // earnings under `totalOgunEarned`/`claimedOgun` — fall back so legacy uploads
    // keep rendering. Response shape matches the GraphQL `scidByTrack` query the
    // track-detail UI in dex/[...slug].tsx reads.
    const scidCode = scid.scid || scid.code || scid.scidCode || ''
    const ogunRewardsEarned = scid.ogunRewardsEarned ?? scid.totalOgunEarned ?? scid.ogunEarned ?? 0
    const ogunRewardsClaimed = scid.ogunRewardsClaimed ?? scid.claimedOgun ?? 0
    const isNft = scid.isNft ?? scid.isNFT ?? false

    return res.status(200).json({
      scidByTrack: {
        id: scid._id.toString(),
        scid: scidCode,
        scidCode, // back-compat for any caller still reading scidCode
        trackId: scid.trackId?.toString() || '',
        profileId: scid.profileId?.toString() || '',
        chainCode: scid.chainCode || 'POL',
        status: scid.status || 'PENDING',
        streamCount: scid.streamCount || 0,
        ogunRewardsEarned,
        ogunRewardsClaimed,
        ipfsCid: scid.ipfsCid || '',
        playbackUrl: scid.playbackUrl || '',
        isNft,
        tokenId: scid.tokenId ?? null,
        createdAt: scid.createdAt || null,
        streamCountCalibratedAt: scid.streamCountCalibratedAt || null,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
