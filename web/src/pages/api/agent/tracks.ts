/**
 * SoundChain Agent Gateway - Track Search
 * GET /api/agent/tracks?q=searchterm&limit=10
 *
 * Search tracks by title, artist, album.
 * Now queries Atlas directly instead of proxying through Lambda GraphQL.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

interface TrackSearchResponse {
  success: boolean
  data?: {
    tracks: any[]
    total_count: number
    has_more: boolean
  }
  error?: string
  hint?: string
  meta: {
    timestamp: string
    request_id: string
    query?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrackSearchResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      meta: { timestamp: new Date().toISOString(), request_id: `req_${Date.now()}` }
    })
  }

  const query = (req.query.q as string) || ''
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query too short',
      hint: 'Provide a search query with at least 2 characters: ?q=jazz',
      meta: { timestamp: new Date().toISOString(), request_id: requestId, query }
    })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const tracks = await db.collection('tracks')
      .find({
        deleted: { $ne: true },
        $or: [
          { title: searchRegex },
          { artist: searchRegex },
          { album: searchRegex },
        ],
      })
      .sort({ playbackCount: -1 })
      .limit(limit)
      .toArray()

    // Look up profiles for owners
    const profileIds = [...new Set(tracks.map(t => t.profileId?.toString()).filter(Boolean))]
    const profiles = profileIds.length > 0
      ? await db.collection('profiles')
          .find({ _id: { $in: profileIds.map(id => { try { return new (require('mongodb').ObjectId)(id) } catch { return id } }) } })
          .toArray()
      : []
    const profileMap = new Map(profiles.map(p => [p._id.toString(), p]))

    const totalCount = await db.collection('tracks').countDocuments({
      deleted: { $ne: true },
      $or: [
        { title: searchRegex },
        { artist: searchRegex },
        { album: searchRegex },
      ],
    })

    const formatted = tracks.map((track: any) => {
      const profile = profileMap.get(track.profileId?.toString())
      return {
        id: track._id.toString(),
        title: track.title,
        artist: track.artist,
        album: track.album,
        description: track.description,
        artwork_url: track.artworkUrl,
        stream_url: track.assetUrl || track.audioUrl,
        duration: track.duration,
        play_count: track.playbackCount || 0,
        favorite_count: track.favoriteCount || 0,
        created_at: track.createdAt,
        scid: track.scid,
        is_nft: !!track.assetUrl,
        owner: profile ? {
          handle: profile.userHandle,
          display_name: profile.displayName,
        } : null,
      }
    })

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

    res.status(200).json({
      success: true,
      data: {
        tracks: formatted,
        total_count: totalCount,
        has_more: totalCount > limit,
      },
      meta: { timestamp: new Date().toISOString(), request_id: requestId, query }
    })
  } catch (error: any) {
    console.error('[Agent Tracks] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to search tracks',
      meta: { timestamp: new Date().toISOString(), request_id: requestId, query }
    })
  }
}
