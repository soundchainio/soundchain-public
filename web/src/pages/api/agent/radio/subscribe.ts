/**
 * Agent Radio Subscriptions
 * POST - Subscribe to an artist
 * GET - Get agent's subscriptions or artist's subscribers
 * DELETE - Unsubscribe from artist
 */

import type { NextApiRequest, NextApiResponse } from 'next'

interface Subscription {
  id: string
  artist_id?: string
  artist_name: string
  agent_name: string
  timestamp: string
}

// In-memory storage
const subscriptions: Subscription[] = []

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'POST') {
    const { artist_id, artist_name, agent_name } = req.body

    if (!artist_name || !agent_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: artist_name, agent_name',
        meta: { request_id: requestId }
      })
    }

    // Check if already subscribed
    const existing = subscriptions.find(
      s => s.artist_name.toLowerCase() === artist_name.toLowerCase() &&
           s.agent_name === agent_name
    )
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already subscribed',
        data: existing,
        meta: { request_id: requestId }
      })
    }

    const newSub: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      artist_id,
      artist_name,
      agent_name,
      timestamp: new Date().toISOString()
    }

    subscriptions.unshift(newSub)
    if (subscriptions.length > 10000) subscriptions.pop()

    // Count total subscribers for this artist
    const artistSubs = subscriptions.filter(
      s => s.artist_name.toLowerCase() === artist_name.toLowerCase()
    ).length

    return res.status(201).json({
      success: true,
      message: `Subscribed to ${artist_name}!`,
      data: {
        subscription: newSub,
        artist_total_subscribers: artistSubs
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'GET') {
    const { agent_name, artist_name } = req.query

    let filtered = subscriptions

    if (agent_name) {
      // Get all artists an agent subscribes to
      filtered = subscriptions.filter(s => s.agent_name === agent_name)
    }
    if (artist_name) {
      // Get all agents subscribed to an artist
      filtered = subscriptions.filter(
        s => s.artist_name.toLowerCase() === (artist_name as string).toLowerCase()
      )
    }

    // Get top artists by subscriber count
    const artistCounts: Record<string, number> = {}
    subscriptions.forEach(s => {
      artistCounts[s.artist_name] = (artistCounts[s.artist_name] || 0) + 1
    })
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ artist: name, subscribers: count }))

    return res.status(200).json({
      success: true,
      data: {
        subscriptions: filtered.slice(0, 100),
        total: filtered.length,
        top_artists: topArtists
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'DELETE') {
    const { artist_name, agent_name } = req.body

    const index = subscriptions.findIndex(
      s => s.artist_name.toLowerCase() === artist_name.toLowerCase() &&
           s.agent_name === agent_name
    )

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        meta: { request_id: requestId }
      })
    }

    subscriptions.splice(index, 1)

    return res.status(200).json({
      success: true,
      message: `Unsubscribed from ${artist_name}`,
      meta: { request_id: requestId }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET, POST, or DELETE.',
    meta: { request_id: requestId }
  })
}
