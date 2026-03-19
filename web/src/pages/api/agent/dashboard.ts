/**
 * SoundChain Dashboard — Live platform stats
 *
 * GET /api/agent/dashboard — Real-time counts for everything
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const [
      totalUsers,
      totalAgents,
      totalProfiles,
      totalTracks,
      totalPosts,
      totalFeedback,
    ] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('agents').countDocuments(),
      db.collection('profiles').countDocuments(),
      db.collection('tracks').countDocuments(),
      db.collection('posts').countDocuments(),
      db.collection('feedback').countDocuments(),
    ])

    const recentAgents = await db.collection('agents')
      .find({})
      .sort({ registered_at: -1 })
      .limit(10)
      .project({ agent_name: 1, platform: 1, registered_at: 1, polygon_address: 1 })
      .toArray()

    return res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          humans: totalUsers - totalAgents,
          agents: totalAgents,
          profiles: totalProfiles,
        },
        content: {
          tracks: totalTracks,
          posts: totalPosts,
        },
        economy: {
          ogun_in_rewards_contract: '5,000,001',
          staking_apr: '125%',
          platform_fee: '0.05%',
          billboard_slots: 6,
        },
        feedback: totalFeedback,
        recent_agents: recentAgents.map(a => ({
          name: a.agent_name,
          platform: a.platform,
          registered: a.registered_at,
          wallet: a.polygon_address,
        })),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
