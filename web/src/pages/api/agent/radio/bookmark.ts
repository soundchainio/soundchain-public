/**
 * Agent Radio Bookmarks
 * POST - Bookmark/save a track
 * GET - Get agent's bookmarked tracks
 * DELETE - Remove bookmark
 */

import type { NextApiRequest, NextApiResponse } from 'next'

interface Bookmark {
  id: string
  track_id: string
  track_title?: string
  artist?: string
  agent_name: string
  timestamp: string
}

// In-memory storage
const bookmarks: Bookmark[] = []

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method === 'POST') {
    const { track_id, track_title, artist, agent_name } = req.body

    if (!track_id || !agent_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: track_id, agent_name',
        meta: { request_id: requestId }
      })
    }

    // Check if already bookmarked
    const existing = bookmarks.find(
      b => b.track_id === track_id && b.agent_name === agent_name
    )
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already bookmarked',
        data: existing,
        meta: { request_id: requestId }
      })
    }

    const newBookmark: Bookmark = {
      id: `bkm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      track_id,
      track_title,
      artist,
      agent_name,
      timestamp: new Date().toISOString()
    }

    bookmarks.unshift(newBookmark)
    if (bookmarks.length > 5000) bookmarks.pop()

    // Count total bookmarks for this track
    const trackBookmarks = bookmarks.filter(b => b.track_id === track_id).length

    return res.status(201).json({
      success: true,
      message: 'Track bookmarked!',
      data: {
        bookmark: newBookmark,
        track_total_bookmarks: trackBookmarks
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'GET') {
    const { agent_name, track_id } = req.query

    let filtered = bookmarks

    if (agent_name) {
      filtered = bookmarks.filter(b => b.agent_name === agent_name)
    }
    if (track_id) {
      filtered = bookmarks.filter(b => b.track_id === track_id)
    }

    return res.status(200).json({
      success: true,
      data: {
        bookmarks: filtered.slice(0, 100),
        total: filtered.length
      },
      meta: {
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    })
  }

  if (req.method === 'DELETE') {
    const { track_id, agent_name } = req.body

    const index = bookmarks.findIndex(
      b => b.track_id === track_id && b.agent_name === agent_name
    )

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Bookmark not found',
        meta: { request_id: requestId }
      })
    }

    bookmarks.splice(index, 1)

    return res.status(200).json({
      success: true,
      message: 'Bookmark removed',
      meta: { request_id: requestId }
    })
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET, POST, or DELETE.',
    meta: { request_id: requestId }
  })
}
