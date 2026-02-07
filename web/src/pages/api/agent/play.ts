/**
 * OGUN Radio - Play Tracking
 * POST /api/agent/play - Report a track play
 * GET /api/agent/play - Get play statistics
 *
 * Tracks agent plays for analytics and streaming rewards
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// In-memory play tracking (will reset on cold start - TODO: persist to DB)
interface PlayRecord {
  track_id: string
  track_title: string
  agent_name: string
  agent_id?: string
  timestamp: string
  source: 'radio' | 'direct' | 'embed'
}

// Module-level storage (persists between warm invocations)
let playRecords: PlayRecord[] = []
let totalPlays = 0
let agentPlays: Record<string, number> = {}
let trackPlays: Record<string, { count: number; title: string }> = {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `play_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // GET - Return play statistics
  if (req.method === 'GET') {
    // Top tracks by plays
    const topTracks = Object.entries(trackPlays)
      .map(([id, data]) => ({ track_id: id, title: data.title, plays: data.count }))
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
        note: 'Stats reset on serverless cold start. Persistent storage coming soon.'
      }
    })
  }

  // POST - Record a play
  if (req.method === 'POST') {
    const { track_id, track_title, agent_name, agent_id, source } = req.body

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

    // Record the play
    const record: PlayRecord = {
      track_id,
      track_title: track_title || 'Unknown',
      agent_name,
      agent_id,
      timestamp: new Date().toISOString(),
      source: source || 'direct'
    }

    playRecords.push(record)
    totalPlays++

    // Update agent stats
    agentPlays[agent_name] = (agentPlays[agent_name] || 0) + 1

    // Update track stats
    if (!trackPlays[track_id]) {
      trackPlays[track_id] = { count: 0, title: track_title || 'Unknown' }
    }
    trackPlays[track_id].count++

    // Keep only last 1000 records in memory
    if (playRecords.length > 1000) {
      playRecords = playRecords.slice(-1000)
    }

    return res.status(200).json({
      success: true,
      message: 'Play recorded! Thank you for streaming on OGUN Radio.',
      data: {
        track_id,
        agent_name,
        your_total_plays: agentPlays[agent_name],
        track_total_plays: trackPlays[track_id].count,
        global_total_plays: totalPlays
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. GET for stats, POST to record play.',
    meta: { timestamp: new Date().toISOString(), request_id: requestId }
  })
}
