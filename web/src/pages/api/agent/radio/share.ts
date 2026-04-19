/**
 * Agent Radio Shares
 * POST - Share a track (to Moltbook, social, etc.)
 * GET - Get share stats for a track
 */

import type { NextApiRequest, NextApiResponse } from 'next'

interface Share {
  id: string
  track_id: string
  track_title?: string
  artist?: string
  agent_name: string
  platform: string // 'moltbook', 'twitter', 'internal', etc.
  message?: string
  timestamp: string
}

// In-memory storage
const shares: Share[] = []

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'POST') {
    const { track_id, track_title, artist, agent_name, platform = 'internal', message } = req.body

    if (!track_id || !agent_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: track_id, agent_name',
        meta: { request_id: requestId }
      })
    }

    const newShare: Share = {
      id: `shr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      track_id,
      track_title,
      artist,
      agent_name,
      platform,
      message: message?.slice(0, 280), // Tweet-length
      timestamp: new Date().toISOString()
    }

    shares.unshift(newShare)
    if (shares.length > 5000) shares.pop()

    // Count total shares for this track
    const trackShares = shares.filter(s => s.track_id === track_id).length

    // Generate share text for Moltbook
    const shareText = message ||
      `🎵 Listening to "${track_title}" by ${artist} on OGUN Radio\n\n` +
      `soundchain.io/track/${track_id}\n` +
      `soundchain.io/radio`

    return res.status(201).json({
      success: true,
      message: 'Track shared!',
      data: {
        share: newShare,
        track_total_shares: trackShares,
        share_text: shareText,
        share_links: {
          soundchain: `https://soundchain.io/track/${track_id}`,
          radio: 'https://soundchain.io/radio',
          api: 'https://soundchain.io/api/agent/radio'
        }
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'GET') {
    const { track_id, agent_name, limit = '50' } = req.query

    let filtered = shares

    if (track_id) {
      filtered = shares.filter(s => s.track_id === track_id)
    }
    if (agent_name) {
      filtered = shares.filter(s => s.agent_name === agent_name)
    }

    // Get top shared tracks
    const trackCounts: Record<string, { title: string; artist: string; count: number }> = {}
    shares.forEach(s => {
      if (!trackCounts[s.track_id]) {
        trackCounts[s.track_id] = {
          title: s.track_title || 'Unknown',
          artist: s.artist || 'Unknown',
          count: 0
        }
      }
      trackCounts[s.track_id].count++
    })
    const topShared = Object.entries(trackCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, data]) => ({
        track_id: id,
        title: data.title,
        artist: data.artist,
        shares: data.count
      }))

    // Get top sharing agents
    const agentCounts: Record<string, number> = {}
    shares.forEach(s => {
      agentCounts[s.agent_name] = (agentCounts[s.agent_name] || 0) + 1
    })
    const topAgents = Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ agent: name, shares: count }))

    return res.status(200).json({
      success: true,
      data: {
        shares: filtered.slice(0, parseInt(limit as string)),
        total: filtered.length,
        top_shared_tracks: topShared,
        top_sharing_agents: topAgents
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET or POST.',
    meta: { request_id: requestId }
  })
}
