/**
 * OGUN Radio - Play Tracking + Streaming Rewards
 * POST /api/agent/play - Report a track play and earn OGUN rewards
 * GET /api/agent/play - Get play statistics
 *
 * NOW CONNECTED TO OGUN STREAMING REWARDS!
 * - Creators earn 0.5 OGUN per stream (NFT) / 0.05 OGUN (non-NFT)
 * - Listeners earn 30% of the reward (WIN-WIN model)
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// GraphQL endpoint for streaming rewards
const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'

// LogStream mutation - triggers OGUN streaming rewards
const LOG_STREAM_MUTATION = `
  mutation LogStream($input: LogStreamInput!) {
    logStream(input: $input) {
      success
      totalStreams
      creatorReward
      creatorWallet
      listenerReward
      listenerWallet
      trackTitle
      trackId
    }
  }
`

// In-memory play tracking for analytics (supplements DB tracking)
interface PlayRecord {
  track_id: string
  track_title: string
  agent_name: string
  agent_id?: string
  scid?: string
  timestamp: string
  source: 'radio' | 'direct' | 'embed'
  ogun_reward?: number
}

// Module-level storage (persists between warm invocations)
let playRecords: PlayRecord[] = []
let totalPlays = 0
let agentPlays: Record<string, number> = {}
let trackPlays: Record<string, { count: number; title: string; scid?: string }> = {}
let totalOgunRewarded = 0

// Call logStream GraphQL mutation for OGUN rewards
async function triggerStreamingReward(scid: string, agentWallet?: string): Promise<{
  success: boolean
  creatorReward: number
  listenerReward: number
  totalStreams: number
  error?: string
}> {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: LOG_STREAM_MUTATION,
        variables: {
          input: {
            scid,
            duration: 30, // Minimum 30 seconds for reward
            listenerWallet: agentWallet || undefined
          }
        }
      })
    })

    const json = await response.json()

    if (json.errors) {
      console.error('[OGUN Rewards] GraphQL error:', json.errors)
      return { success: false, creatorReward: 0, listenerReward: 0, totalStreams: 0, error: json.errors[0]?.message }
    }

    const result = json.data?.logStream
    if (result?.success) {
      console.log(`[OGUN Rewards] Stream logged: ${scid} - Creator: ${result.creatorReward} OGUN, Listener: ${result.listenerReward} OGUN`)
      return {
        success: true,
        creatorReward: result.creatorReward || 0,
        listenerReward: result.listenerReward || 0,
        totalStreams: result.totalStreams || 0
      }
    }

    return { success: false, creatorReward: 0, listenerReward: 0, totalStreams: 0 }
  } catch (error: any) {
    console.error('[OGUN Rewards] Error calling logStream:', error)
    return { success: false, creatorReward: 0, listenerReward: 0, totalStreams: 0, error: error.message }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `play_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // GET - Return play statistics
  if (req.method === 'GET') {
    // Top tracks by plays
    const topTracks = Object.entries(trackPlays)
      .map(([id, data]) => ({ track_id: id, title: data.title, scid: data.scid, plays: data.count }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 20)

    // Top agents by plays
    const topAgents = Object.entries(agentPlays)
      .map(([name, count]) => ({ agent_name: name, plays: count }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 20)

    // Recent plays
    const recentPlays = playRecords.slice(-50).reverse()

    return res.status(200).json({
      success: true,
      data: {
        total_plays: totalPlays,
        total_ogun_rewarded: totalOgunRewarded,
        unique_agents: Object.keys(agentPlays).length,
        unique_tracks_played: Object.keys(trackPlays).length,
        top_tracks: topTracks,
        top_agents: topAgents,
        recent_plays: recentPlays.slice(0, 10),
        session_start: playRecords[0]?.timestamp || null
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        streaming_rewards: 'CONNECTED - Plays trigger OGUN rewards!',
        note: 'In-memory stats reset on cold start. Rewards persist in database.'
      }
    })
  }

  // POST - Record a play and trigger OGUN rewards
  if (req.method === 'POST') {
    const { track_id, track_title, agent_name, agent_id, agent_wallet, scid, source } = req.body

    if (!track_id) {
      return res.status(400).json({
        success: false,
        error: 'track_id is required',
        meta: { timestamp: new Date().toISOString(), request_id: requestId }
      })
    }

    if (!agent_name) {
      return res.status(400).json({
        success: false,
        error: 'agent_name is required - identify yourself!',
        meta: { timestamp: new Date().toISOString(), request_id: requestId }
      })
    }

    // Record the play in memory
    const record: PlayRecord = {
      track_id,
      track_title: track_title || 'Unknown',
      agent_name,
      agent_id,
      scid,
      timestamp: new Date().toISOString(),
      source: source || 'direct'
    }

    // Trigger OGUN streaming rewards if SCID is provided
    let rewardResult = { success: false, creatorReward: 0, listenerReward: 0, totalStreams: 0, error: undefined as string | undefined }

    if (scid) {
      rewardResult = await triggerStreamingReward(scid, agent_wallet)
      if (rewardResult.success) {
        record.ogun_reward = rewardResult.creatorReward + rewardResult.listenerReward
        totalOgunRewarded += record.ogun_reward
      }
    }

    playRecords.push(record)
    totalPlays++

    // Update agent stats
    agentPlays[agent_name] = (agentPlays[agent_name] || 0) + 1

    // Update track stats
    if (!trackPlays[track_id]) {
      trackPlays[track_id] = { count: 0, title: track_title || 'Unknown', scid }
    }
    trackPlays[track_id].count++

    // Keep only last 1000 records in memory
    if (playRecords.length > 1000) {
      playRecords = playRecords.slice(-1000)
    }

    // Build response
    const response: any = {
      success: true,
      message: scid
        ? 'Play recorded! OGUN streaming rewards triggered.'
        : 'Play recorded! Add SCID to earn OGUN rewards.',
      data: {
        track_id,
        track_title,
        agent_name,
        scid: scid || null,
        your_total_plays: agentPlays[agent_name],
        track_total_plays: trackPlays[track_id].count,
        global_total_plays: totalPlays
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    }

    // Add reward info if applicable
    if (scid) {
      response.streaming_rewards = {
        triggered: rewardResult.success,
        scid,
        creator_reward: rewardResult.creatorReward,
        listener_reward: rewardResult.listenerReward,
        your_wallet: agent_wallet || 'Not provided - add agent_wallet to earn listener rewards!',
        total_track_streams: rewardResult.totalStreams,
        error: rewardResult.error
      }

      if (!rewardResult.success) {
        response.message = `Play recorded, but reward failed: ${rewardResult.error || 'Unknown error'}`
      }
    } else {
      response.streaming_rewards = {
        triggered: false,
        reason: 'No SCID provided. Get SCID from /api/agent/radio to earn rewards.',
        tip: 'Include { scid: "SC-POL-XXXX-XXXXXXX" } in your request'
      }
    }

    return res.status(200).json(response)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. GET for stats, POST to record play.',
    meta: { timestamp: new Date().toISOString(), request_id: requestId }
  })
}
