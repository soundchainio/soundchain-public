/**
 * GET /api/profile/rewards — Vercel-direct replacement for PROFILE_STREAMING_REWARDS + MY_LISTENER_REWARDS
 *
 * ?profileId=xxx — streaming rewards for profile
 * Returns creator rewards + listener rewards in one call.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const profileId = req.query.profileId as string
  if (!profileId) return res.status(400).json({ error: 'profileId required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const pid = new ObjectId(profileId)

    const [profile, scids] = await Promise.all([
      db.collection('profiles').findOne({ _id: pid }, {
        projection: {
          totalOgunEarned: 1, dailyOgunEarned: 1, totalStreamsReceived: 1,
          dailyListenerOgunEarned: 1, totalListenerOgunEarned: 1,
          dailyTracksStreamed: 1, totalTracksStreamed: 1,
        },
      }),
      db.collection('scids')
        .find({ profileId: pid })
        .project({ streamCount: 1, ogunEarned: 1, title: 1 })
        .toArray(),
    ])

    return res.status(200).json({
      creatorRewards: {
        totalOgunEarned: profile?.totalOgunEarned || 0,
        dailyOgunEarned: profile?.dailyOgunEarned || 0,
        totalStreamsReceived: profile?.totalStreamsReceived || 0,
        trackCount: scids.length,
        tracks: scids.map(s => ({
          id: s._id.toString(),
          title: s.title || '',
          streamCount: s.streamCount || 0,
          ogunEarned: s.ogunEarned || 0,
        })),
      },
      listenerRewards: {
        dailyListenerOgunEarned: profile?.dailyListenerOgunEarned || 0,
        totalListenerOgunEarned: profile?.totalListenerOgunEarned || 0,
        dailyTracksStreamed: profile?.dailyTracksStreamed || 0,
        totalTracksStreamed: profile?.totalTracksStreamed || 0,
      },
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
