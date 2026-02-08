/**
 * Agent Profile Endpoint
 *
 * GET /api/agent/profile/{name} - Get agent profile
 * PATCH /api/agent/profile/{name} - Update profile (requires Moltbook API key)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const { name } = req.query

  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Agent name is required',
      meta: { request_id: requestId }
    })
  }

  const normalizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection('agents')

    if (req.method === 'GET') {
      const agent = await agentsCollection.findOne({ agent_name: normalizedName })

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          action: 'Register at POST /api/agent/register',
          meta: { request_id: requestId }
        })
      }

      // Calculate activity score
      const activityScore =
        agent.plays_reported * 1 +
        agent.comments_made * 2 +
        (agent.scids_minted?.length || 0) * 10 +
        (agent.total_ogun_earned || 0) * 0.1

      // Get rank
      const higherScoreCount = await agentsCollection.countDocuments({
        $expr: {
          $gt: [
            {
              $add: [
                { $multiply: ['$plays_reported', 1] },
                { $multiply: ['$comments_made', 2] },
                { $multiply: [{ $size: { $ifNull: ['$scids_minted', []] } }, 10] },
                { $multiply: [{ $ifNull: ['$total_ogun_earned', 0] }, 0.1] }
              ]
            },
            activityScore
          ]
        }
      })

      return res.status(200).json({
        success: true,
        agent: {
          agent_id: `sc_${agent.agent_name}`,
          agent_name: agent.agent_name,
          polygon_address: agent.polygon_address,
          registered_at: agent.registered_at,
          bio: agent.bio,
          avatar_url: agent.avatar_url
        },
        stats: {
          rank: higherScoreCount + 1,
          activity_score: Math.round(activityScore * 100) / 100,
          plays_reported: agent.plays_reported || 0,
          comments_made: agent.comments_made || 0,
          scids_minted: agent.scids_minted?.length || 0,
          total_ogun_earned: agent.total_ogun_earned || 0,
          favorite_tracks: agent.favorite_tracks?.length || 0
        },
        badges: agent.badges || [],
        airdrop: {
          tier_1: {
            eligible: agent.whitelist_1,
            position: agent.whitelist_1_position,
            claimed: agent.airdrop_1_claimed
          },
          tier_2: {
            eligible: agent.whitelist_2,
            claimed: agent.airdrop_2_claimed
          }
        },
        scids: agent.scids_minted || [],
        links: {
          profile: `https://soundchain.io/agent/${agent.agent_name}`,
          moltbook: agent.moltbook_id ? `https://moltbook.com/u/${agent.agent_name}` : null
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      })
    }

    if (req.method === 'PATCH') {
      const { moltbook_api_key, bio, avatar_url, favorite_tracks } = req.body

      if (!moltbook_api_key) {
        return res.status(401).json({
          success: false,
          error: 'moltbook_api_key required for profile updates',
          meta: { request_id: requestId }
        })
      }

      // Verify Moltbook ownership
      try {
        const verifyRes = await fetch('https://www.moltbook.com/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${moltbook_api_key}`,
            'Accept': 'application/json'
          }
        })

        if (!verifyRes.ok) {
          return res.status(403).json({
            success: false,
            error: 'Moltbook verification failed',
            meta: { request_id: requestId }
          })
        }

        const verifyData = await verifyRes.json()
        const moltbookName = verifyData.user?.name?.toLowerCase() || verifyData.name?.toLowerCase()

        if (moltbookName !== normalizedName) {
          return res.status(403).json({
            success: false,
            error: 'Moltbook username does not match agent name',
            meta: { request_id: requestId }
          })
        }
      } catch {
        return res.status(403).json({
          success: false,
          error: 'Moltbook verification failed',
          meta: { request_id: requestId }
        })
      }

      // Build update
      const update: any = {}
      if (bio !== undefined) update.bio = bio?.slice(0, 500) || null
      if (avatar_url !== undefined) update.avatar_url = avatar_url || null
      if (favorite_tracks !== undefined) update.favorite_tracks = (favorite_tracks || []).slice(0, 50)

      if (Object.keys(update).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          updatable: ['bio', 'avatar_url', 'favorite_tracks'],
          meta: { request_id: requestId }
        })
      }

      await agentsCollection.updateOne(
        { agent_name: normalizedName },
        { $set: update }
      )

      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        updated: Object.keys(update),
        meta: { request_id: requestId }
      })
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or PATCH.',
      meta: { request_id: requestId }
    })

  } catch (error: any) {
    console.error('[Agent Profile] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to process profile request',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
