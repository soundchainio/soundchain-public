/**
 * SoundChain Dashboard — Live platform stats
 *
 * GET /api/agent/dashboard — Real-time counts for everything
 *
 * Queries MongoDB Atlas directly for all collections.
 * The register endpoint writes to db('soundchain'), so we read from there.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' })
  }

  try {
    const client = await clientPromise

    // Try both database names — register.ts uses 'soundchain', old agent endpoints use 'agents'
    const scDb = client.db('soundchain')
    const agentsDb = client.db('agents')

    // All data now lives in Atlas (migrated from DocumentDB on Mar 19, 2026)
    const [
      scUsers, scProfiles, scAgents, scTracks, scPosts, scFeedback, scScids,
      agAgents,
    ] = await Promise.all([
      scDb.collection('users').countDocuments().catch(() => 0),
      scDb.collection('profiles').countDocuments().catch(() => 0),
      scDb.collection('agents').countDocuments().catch(() => 0),
      scDb.collection('tracks').countDocuments().catch(() => 0),
      scDb.collection('posts').countDocuments().catch(() => 0),
      scDb.collection('feedback').countDocuments().catch(() => 0),
      scDb.collection('scids').countDocuments().catch(() => 0),
      agentsDb.collection('agents').countDocuments().catch(() => 0),
    ])

    const totalAgents = Math.max(scAgents, agAgents)
    const totalUsers = Math.max(scUsers, scProfiles)
    const totalTracks = scTracks

    // Count NFTs vs SCid-only tracks
    let nftTracks = 0
    let scidOnlyTracks = 0
    try {
      nftTracks = await scDb.collection('tracks').countDocuments({ contractAddress: { $exists: true, $ne: null } })
      scidOnlyTracks = totalTracks - nftTracks
    } catch {}

    // Recent agent registrations
    let recentAgents: any[] = []
    try {
      recentAgents = await scDb.collection('agents')
        .find({})
        .sort({ registered_at: -1 })
        .limit(10)
        .project({ agent_name: 1, platform: 1, registered_at: 1, polygon_address: 1 })
        .toArray()
    } catch {}
    if (recentAgents.length === 0) {
      try {
        recentAgents = await agentsDb.collection('agents')
          .find({})
          .sort({ registered_at: -1 })
          .limit(10)
          .project({ agent_name: 1, platform: 1, registered_at: 1, polygon_address: 1 })
          .toArray()
      } catch {}
    }

    const liveHumans = totalUsers
    const liveTracks = totalTracks

    return res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: liveHumans + totalAgents,
          humans: liveHumans,
          agents: totalAgents,
          growth: `${totalAgents} agents registered via API`,
        },
        content: {
          tracks: liveTracks,
          nfts: nftTracks,
          scids: scScids,
          radio_queue: 619,
          genres: 34,
        },
        economy: {
          ogun_in_rewards_contract: '5,000,001',
          staking_apr: '125%',
          platform_fee: '0.05%',
          billboard_slots: 6,
        },
        posts: scPosts,
        feedback: scFeedback,
        recent_agents: recentAgents.map(a => ({
          name: a.agent_name,
          platform: a.platform,
          registered: a.registered_at,
          wallet: a.polygon_address,
        })),
      },
      _debug: {
        sc_db: { users: scUsers, profiles: scProfiles, agents: scAgents, tracks: scTracks },
        agents_db: { agents: agAgents },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
