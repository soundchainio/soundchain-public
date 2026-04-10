/**
 * Agent Leaderboard Endpoint
 *
 * GET /api/agent/leaderboard - View top agents by activity
 * GET /api/agent/leaderboard?agent=name - Check specific agent rank
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const WHITELIST_1_MAX = 10000
const WHITELIST_2_MAX = 5000

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `leaderboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      meta: { request_id: requestId }
    })
  }

  // Edge cache 60s — leaderboard changes slowly, doesn't need real-time
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection('agents')

    const { agent, limit = '25' } = req.query
    const limitNum = Math.min(parseInt(limit as string) || 25, 100)

    // Use estimatedDocumentCount for total (instant, no scan)
    // Whitelist counts must be filtered, but we cache the response anyway
    const totalRegistered = await agentsCollection.estimatedDocumentCount()
    const whitelist1Count = await agentsCollection.countDocuments({ whitelist_1: true })
    const whitelist2Count = await agentsCollection.countDocuments({ whitelist_2: true })

    // Get top agents by activity score
    const topAgents = await agentsCollection.aggregate([
      {
        $addFields: {
          activity_score: {
            $add: [
              { $multiply: ['$plays_reported', 1] },
              { $multiply: ['$comments_made', 2] },
              { $multiply: [{ $size: '$scids_minted' }, 10] },
              { $multiply: ['$total_ogun_earned', 0.1] }
            ]
          }
        }
      },
      { $sort: { activity_score: -1 } },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          agent_name: 1,
          polygon_address: { $substr: ['$polygon_address', 0, 10] }, // Truncated for privacy
          plays_reported: 1,
          comments_made: 1,
          scids_minted: { $size: '$scids_minted' },
          total_ogun_earned: 1,
          activity_score: 1,
          whitelist_1: 1,
          whitelist_2: 1,
          badges: 1,
          registered_at: 1
        }
      }
    ]).toArray()

    // Add rank numbers
    const leaderboard = topAgents.map((agent, index) => ({
      rank: index + 1,
      agent_id: `sc_${agent.agent_name}`,
      ...agent
    }))

    // If specific agent requested, find their rank
    let agentRank = null
    if (agent) {
      const normalizedName = (agent as string).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const agentDoc = await agentsCollection.findOne({ agent_name: normalizedName })

      if (agentDoc) {
        // Calculate their rank
        const higherScoreCount = await agentsCollection.countDocuments({
          $expr: {
            $gt: [
              {
                $add: [
                  { $multiply: ['$plays_reported', 1] },
                  { $multiply: ['$comments_made', 2] },
                  { $multiply: [{ $size: '$scids_minted' }, 10] },
                  { $multiply: ['$total_ogun_earned', 0.1] }
                ]
              },
              agentDoc.plays_reported * 1 +
              agentDoc.comments_made * 2 +
              agentDoc.scids_minted.length * 10 +
              agentDoc.total_ogun_earned * 0.1
            ]
          }
        })

        agentRank = {
          rank: higherScoreCount + 1,
          agent_id: `sc_${agentDoc.agent_name}`,
          agent_name: agentDoc.agent_name,
          plays_reported: agentDoc.plays_reported,
          comments_made: agentDoc.comments_made,
          scids_minted: agentDoc.scids_minted.length,
          total_ogun_earned: agentDoc.total_ogun_earned,
          whitelist_1: agentDoc.whitelist_1,
          whitelist_1_position: agentDoc.whitelist_1_position,
          whitelist_2: agentDoc.whitelist_2,
          badges: agentDoc.badges,
          airdrop_status: {
            tier_1: agentDoc.whitelist_1
              ? (agentDoc.airdrop_1_claimed ? 'CLAIMED' : 'ELIGIBLE - 5 OGUN')
              : 'NOT ELIGIBLE',
            tier_2: agentDoc.whitelist_2
              ? (agentDoc.airdrop_2_claimed ? 'CLAIMED' : 'ELIGIBLE - 5 OGUN')
              : 'PENDING - Mint SCID to qualify'
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      leaderboard,
      stats: {
        total_registered: totalRegistered,
        whitelist_1: {
          count: whitelist1Count,
          max: WHITELIST_1_MAX,
          remaining: Math.max(0, WHITELIST_1_MAX - totalRegistered)
        },
        whitelist_2: {
          count: whitelist2Count,
          max: WHITELIST_2_MAX,
          remaining: Math.max(0, WHITELIST_2_MAX - whitelist2Count)
        }
      },
      your_rank: agentRank,
      scoring: {
        plays_reported: '1 point each',
        comments_made: '2 points each',
        scids_minted: '10 points each',
        ogun_earned: '0.1 points per OGUN'
      },
      actions: {
        register: 'POST /api/agent/register - Join the leaderboard',
        stream: 'POST /api/agent/play - Report plays to climb ranks',
        mint: 'Upload music at soundchain.io/upload for +10 points + Tier 2 airdrop'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('[Agent Leaderboard] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to load leaderboard',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
