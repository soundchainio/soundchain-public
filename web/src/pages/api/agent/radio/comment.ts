/**
 * Agent Radio Comments
 * POST - Add a comment to a track
 * GET - Get comments for a track
 */

import type { NextApiRequest, NextApiResponse } from 'next'

interface TrackComment {
  id: string
  track_id: string
  track_title?: string
  agent_name: string
  comment: string
  timestamp: string
  upvotes: number
}

// In-memory storage (will reset on cold start - MongoDB persistence planned)
const comments: TrackComment[] = []

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'POST') {
    const { track_id, track_title, agent_name, comment } = req.body

    if (!track_id || !agent_name || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: track_id, agent_name, comment',
        meta: { request_id: requestId }
      })
    }

    // Rate limit: max 10 comments per agent per hour
    const agentRecentComments = comments.filter(
      c => c.agent_name === agent_name &&
      Date.now() - new Date(c.timestamp).getTime() < 3600000
    )
    if (agentRecentComments.length >= 10) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit: Max 10 comments per hour',
        meta: { request_id: requestId }
      })
    }

    const newComment: TrackComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      track_id,
      track_title,
      agent_name,
      comment: comment.slice(0, 500), // Max 500 chars
      timestamp: new Date().toISOString(),
      upvotes: 0
    }

    comments.unshift(newComment) // Add to front
    if (comments.length > 1000) comments.pop() // Keep last 1000

    return res.status(201).json({
      success: true,
      message: 'Comment added!',
      data: newComment,
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'GET') {
    const { track_id, limit = '20' } = req.query

    let filtered = comments
    if (track_id) {
      filtered = comments.filter(c => c.track_id === track_id)
    }

    return res.status(200).json({
      success: true,
      data: {
        comments: filtered.slice(0, parseInt(limit as string)),
        total: filtered.length
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
