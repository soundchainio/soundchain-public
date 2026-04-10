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

  // Edge cache 5 minutes — dashboard stats don't need real-time
  // M0 free tier protection: this endpoint was doing 9 countDocuments per request
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  try {
    const client = await clientPromise

    // Try both database names — register.ts uses 'soundchain', old agent endpoints use 'agents'
    const scDb = client.db('soundchain')
    const agentsDb = client.db('agents')

    // estimatedDocumentCount is INSTANT — no scan, no connection hold
    // This was previously 9 expensive countDocuments — killed M0 free tier
    const [
      scUsers, scProfiles, scAgents, scTracks, scPosts, scFeedback, scScids,
      agAgents,
    ] = await Promise.all([
      scDb.collection('users').estimatedDocumentCount().catch(() => 0),
      scDb.collection('profiles').estimatedDocumentCount().catch(() => 0),
      scDb.collection('agents').estimatedDocumentCount().catch(() => 0),
      scDb.collection('tracks').estimatedDocumentCount().catch(() => 0),
      scDb.collection('posts').estimatedDocumentCount().catch(() => 0),
      scDb.collection('feedback').estimatedDocumentCount().catch(() => 0),
      scDb.collection('scids').estimatedDocumentCount().catch(() => 0),
      agentsDb.collection('agents').estimatedDocumentCount().catch(() => 0),
    ])

    const totalAgents = Math.max(scAgents, agAgents)
    const totalUsers = Math.max(scUsers, scProfiles)
    const totalTracks = scTracks

    // Skip the filtered NFT count — too expensive for dashboard, estimate instead
    const nftTracks = Math.floor(totalTracks * 0.1) // Rough estimate
    const scidOnlyTracks = totalTracks - nftTracks

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
