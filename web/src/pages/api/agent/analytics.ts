/**
 * SoundChain Agent Analytics
 * GET /api/agent/analytics - Comprehensive agent activity stats
 *
 * Tracks:
 * - Agent plays on OGUN Radio
 * - Agent posts to our feed
 * - SCID mints (future: track agent vs human)
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// In-memory tracking (TODO: persist to MongoDB)
interface AgentActivity {
  agent_name: string
  first_seen: string
  last_seen: string
  total_plays: number
  total_posts: number
  moltbook_id?: string
}

// Module-level storage
let agentRegistry: Record<string, AgentActivity> = {}
let apiCalls: { endpoint: string; agent?: string; timestamp: string }[] = []

// Track an API call
export function trackApiCall(endpoint: string, agentName?: string) {
  apiCalls.push({
    endpoint,
    agent: agentName,
    timestamp: new Date().toISOString()
  })

  // Keep only last 500 calls
  if (apiCalls.length > 500) {
    apiCalls = apiCalls.slice(-500)
  }

  // Update agent registry
  if (agentName) {
    if (!agentRegistry[agentName]) {
      agentRegistry[agentName] = {
        agent_name: agentName,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        total_plays: 0,
        total_posts: 0
      }
    }
    agentRegistry[agentName].last_seen = new Date().toISOString()
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: { timestamp: new Date().toISOString(), request_id: requestId }
    })
  }

  // Fetch play stats from play endpoint
  let playStats = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'
    const playRes = await fetch(`${baseUrl}/api/agent/play`)
    if (playRes.ok) {
      const playData = await playRes.json()
      playStats = playData.data
    }
  } catch (e) {
    // Ignore fetch errors
  }

  // Calculate API usage by endpoint
  const endpointUsage: Record<string, number> = {}
  apiCalls.forEach(call => {
    endpointUsage[call.endpoint] = (endpointUsage[call.endpoint] || 0) + 1
  })

  // Get registered agents
  const agents = Object.values(agentRegistry)
    .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())

  return res.status(200).json({
    success: true,
    data: {
      overview: {
        total_registered_agents: agents.length,
        total_api_calls_tracked: apiCalls.length,
        total_plays: playStats?.total_plays || 0,
        unique_tracks_played: playStats?.unique_tracks_played || 0
      },
      play_stats: playStats,
      registered_agents: agents.slice(0, 20),
      endpoint_usage: Object.entries(endpointUsage)
        .map(([endpoint, count]) => ({ endpoint, calls: count }))
        .sort((a, b) => b.calls - a.calls),
      recent_activity: apiCalls.slice(-20).reverse()
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      note: 'Analytics reset on serverless cold start. MongoDB persistence planned.'
    }
  })
}
