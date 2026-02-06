/**
 * SoundChain Agent Gateway - Track Search
 * GET /api/agent/tracks?q=searchterm&limit=10
 *
 * Search tracks by title, artist, album.
 * No authentication required.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const SEARCH_TRACKS_QUERY = `
  query AgentSearchTracks($search: String, $limit: Int) {
    exploreTracks(search: $search, page: { first: $limit }) {
      nodes {
        id
        title
        artist
        album
        description
        artworkUrl
        audioUrl
        duration
        playbackCount
        favoriteCount
        createdAt
        scid
        isNft
        owner {
          id
          userHandle
          displayName
        }
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`

// Direct GraphQL fetch for serverless compatibility
async function fetchGraphQL(query: string, variables: Record<string, any>) {
  // Use direct API Gateway URL - custom domain has issues
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  return response.json()
}

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
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`
      }
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
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        query
      }
    })
  }

  try {
    const result = await fetchGraphQL(SEARCH_TRACKS_QUERY, { search: query, limit })
    const data = result.data

    const tracks = (data?.exploreTracks?.nodes || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      description: track.description,
      artwork_url: track.artworkUrl,
      stream_url: track.audioUrl,
      duration: track.duration,
      play_count: track.playbackCount || 0,
      favorite_count: track.favoriteCount || 0,
      created_at: track.createdAt,
      scid: track.scid,
      is_nft: track.isNft || false,
      owner: track.owner ? {
        handle: track.owner.userHandle,
        display_name: track.owner.displayName
      } : null
    }))

    res.status(200).json({
      success: true,
      data: {
        tracks,
        total_count: data.exploreTracks?.pageInfo?.totalCount || tracks.length,
        has_more: data.exploreTracks?.pageInfo?.hasNextPage || false
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        query
      }
    })
  } catch (error: any) {
    console.error('[Agent Tracks] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to search tracks',
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        query
      }
    })
  }
}
