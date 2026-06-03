/**
 * GET /api/rewards/streaming — Vercel-direct replacement for the dead Apollo
 * streaming-rewards reads (StakingPanel's scidsByProfile + BottomNavBar Win-Win's
 * myUnclaimedStreamingRewards), which both hit the api.soundchain.io graphql-stub
 * and returned null → rewards showed 0 → claim/stake buttons stayed disabled.
 *
 * Auth via cookie/JWT (authFromRequest). Returns BOTH shapes from one read so each
 * caller uses what it needs:
 *   - scidsByProfile: raw SCID rows (StakingPanel computes its own totals)
 *   - unclaimed: { totalUnclaimed, tracksWithRewards, breakdown[] } (BottomNavBar)
 *
 * Unclaimed math mirrors /api/rewards/claim EXACTLY: Σ max(0, earned − claimed).
 * No invented reward logic — same fields (ogunRewardsEarned / ogunRewardsClaimed).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Legacy scids may store profileId as ObjectId OR string — match both (same
    // defensive pattern as /api/follow/toggle and /api/rewards/claim).
    const pidStr = auth.profileId.toString()
    const scidDocs = await db.collection('scids')
      .find({ profileId: { $in: [auth.profileId, pidStr] as any[] } })
      .project({ scid: 1, trackId: 1, streamCount: 1, ogunRewardsEarned: 1, ogunRewardsClaimed: 1, lastStreamAt: 1 })
      .toArray()

    const scidsByProfile = scidDocs.map((s: any) => ({
      id: s._id.toString(),
      scid: s.scid || '',
      trackId: s.trackId != null ? String(s.trackId) : null,
      streamCount: s.streamCount || 0,
      ogunRewardsEarned: s.ogunRewardsEarned || 0,
      ogunRewardsClaimed: s.ogunRewardsClaimed || 0,
      lastStreamAt: s.lastStreamAt || null,
    }))

    const breakdown = scidsByProfile
      .map((s) => ({ scid: s.scid, trackId: s.trackId, unclaimed: Math.max(0, s.ogunRewardsEarned - s.ogunRewardsClaimed) }))
      .filter((b) => b.unclaimed > 0)
    const totalUnclaimed = breakdown.reduce((a, b) => a + b.unclaimed, 0)

    return res.status(200).json({
      scidsByProfile,
      unclaimed: { totalUnclaimed, tracksWithRewards: breakdown.length, breakdown },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
