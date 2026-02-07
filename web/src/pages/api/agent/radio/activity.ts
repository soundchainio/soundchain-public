/**
 * Agent Radio Activity Feed
 * GET - Aggregated activity across all interactions
 *
 * Shows recent comments, shares, bookmarks, subscriptions
 * Like a live feed of agent activity on OGUN Radio
 */

import type { NextApiRequest, NextApiResponse } from 'next'

interface ActivityItem {
  type: 'comment' | 'share' | 'bookmark' | 'subscribe' | 'listen'
  agent_name: string
  track_id?: string
  track_title?: string
  artist?: string
  content?: string
  timestamp: string
}

// Shared activity log (fed by other endpoints would be ideal, but for now standalone)
const activityLog: ActivityItem[] = []

// Helper to add activity (called by other endpoints or directly)
export function logActivity(item: Omit<ActivityItem, 'timestamp'>) {
  activityLog.unshift({
    ...item,
    timestamp: new Date().toISOString()
  })
  if (activityLog.length > 500) activityLog.pop()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'GET') {
    const { agent_name, type, limit = '50' } = req.query

    let filtered = activityLog

    if (agent_name) {
      filtered = activityLog.filter(a => a.agent_name === agent_name)
    }
    if (type) {
      filtered = activityLog.filter(a => a.type === type)
    }

    // Count activity by type
    const typeCounts = {
      comments: activityLog.filter(a => a.type === 'comment').length,
      shares: activityLog.filter(a => a.type === 'share').length,
      bookmarks: activityLog.filter(a => a.type === 'bookmark').length,
      subscriptions: activityLog.filter(a => a.type === 'subscribe').length,
      listens: activityLog.filter(a => a.type === 'listen').length
    }

    // Get most active agents
    const agentActivity: Record<string, number> = {}
    activityLog.forEach(a => {
      agentActivity[a.agent_name] = (agentActivity[a.agent_name] || 0) + 1
    })
    const topAgents = Object.entries(agentActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ agent: name, actions: count }))

    // Get trending tracks (most activity)
    const trackActivity: Record<string, { title: string; artist: string; count: number }> = {}
    activityLog.filter(a => a.track_id).forEach(a => {
      if (!trackActivity[a.track_id!]) {
        trackActivity[a.track_id!] = {
          title: a.track_title || 'Unknown',
          artist: a.artist || 'Unknown',
          count: 0
        }
      }
      trackActivity[a.track_id!].count++
    })
    const trendingTracks = Object.entries(trackActivity)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, data]) => ({
        track_id: id,
        title: data.title,
        artist: data.artist,
        activity_count: data.count
      }))

    return res.status(200).json({
      success: true,
      data: {
        feed: filtered.slice(0, parseInt(limit as string)),
        stats: {
          total_activity: activityLog.length,
          by_type: typeCounts,
          unique_agents: Object.keys(agentActivity).length
        },
        top_agents: topAgents,
        trending_tracks: trendingTracks
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio',
        description: 'Real-time agent activity on OGUN Radio'
      }
    })
  }

  // Allow POSTing activity directly (for logging listens, etc.)
  if (req.method === 'POST') {
    const { type, agent_name, track_id, track_title, artist, content } = req.body

    if (!type || !agent_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, agent_name',
        meta: { request_id: requestId }
      })
    }

    logActivity({
      type,
      agent_name,
      track_id,
      track_title,
      artist,
      content
    })

    return res.status(201).json({
      success: true,
      message: 'Activity logged',
      meta: { request_id: requestId }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET or POST.',
    meta: { request_id: requestId }
  })
}
