/**
 * OGUN Radio - Decentralized NFT Radio Player
 * GET /api/agent/radio - Get current/random NFT track
 * GET /api/agent/radio?action=playlist - Get radio playlist
 * POST /api/agent/radio/broadcast - Broadcast "Now Playing" (cron)
 *
 * The OGUN agent becomes the decentralized publishing house,
 * showcasing NFT tracks to humans and agents alike.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// GraphQL query for radio tracks - simplified without search or owner
const TRACKS_QUERY = `
  query RadioTracks($limit: Int) {
    exploreTracks(page: { first: $limit }) {
      nodes {
        id
        title
        artist
        album
        description
        artworkUrl
        playbackCount
      }
      pageInfo {
        totalCount
      }
    }
  }
`

// Direct GraphQL fetch for serverless
async function fetchTracks(limit: number = 100) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TRACKS_QUERY,
        variables: { limit }
      })
    })

    const json = await response.json()
    return json.data?.exploreTracks?.nodes || []
  } catch (e) {
    console.error('[OGUN Radio] Fetch error:', e)
    return []
  }
}

interface RadioTrack {
  id: string
  title: string
  artist: string
  album?: string
  description?: string
  artwork_url?: string
  stream_url?: string
  duration?: number
  play_count: number
  scid?: string
  is_nft: boolean
  genres?: string[]
  owner: {
    handle: string
    display_name: string
    avatar?: string
  } | null
  licensing: {
    type: 'nft' | 'open' | 'traditional'
    ogun_enabled: boolean
    streaming_rewards: boolean
  }
}

// In-memory state for current track
let currentTrack: RadioTrack | null = null
let trackStartTime: Date | null = null
let radioPlaylist: RadioTrack[] = []

function formatTrackForBroadcast(track: RadioTrack): string {
  const lines = [
    `🎵 **NOW PLAYING on OGUN Radio**`,
    ``,
    `**${track.title}**`,
    `by ${track.artist}`,
  ]

  if (track.album) {
    lines.push(`Album: ${track.album}`)
  }

  if (track.is_nft) {
    lines.push(``)
    lines.push(`🎨 **NFT Track** - Fully on-chain licensed`)
    lines.push(`💰 Streaming rewards enabled via OGUN L2`)
  }

  if (track.owner) {
    lines.push(``)
    lines.push(`Owner: @${track.owner.handle}`)
  }

  if (track.scid) {
    lines.push(`SCID: ${track.scid}`)
  }

  lines.push(``)
  lines.push(`🔗 Listen: soundchain.io/dex/track/${track.id}`)
  lines.push(`📻 Radio: soundchain.io/api/agent/radio`)
  lines.push(``)
  lines.push(`*OGUN - The gas powering the L2 music economy*`)

  return lines.join('\n')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `radio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const action = req.query.action as string

  if (req.method === 'GET') {
    // Return current track or get a new one
    if (action === 'playlist') {
      // Return the full radio playlist
      return res.status(200).json({
        success: true,
        data: {
          playlist: radioPlaylist,
          current_track: currentTrack,
          current_track_started: trackStartTime?.toISOString(),
          total_tracks: radioPlaylist.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          agent: 'OGUN Radio'
        }
      })
    }

    // Fetch tracks if playlist is empty
    if (radioPlaylist.length === 0) {
      try {
        // Fetch tracks via direct GraphQL
        const rawTracks = await fetchTracks(100)

        const tracks: RadioTrack[] = rawTracks
          .map((track: any) => ({
            id: track.id,
            title: track.title || 'Untitled',
            artist: track.artist || 'Unknown Artist',
            album: track.album,
            description: track.description,
            artwork_url: track.artworkUrl,
            stream_url: null,
            duration: null,
            play_count: track.playbackCount || 0,
            scid: null,
            is_nft: false,
            genres: [],
            owner: null, // Not queried to avoid GraphQL error
            licensing: {
              type: 'open' as const,
              ogun_enabled: false,
              streaming_rewards: false
            }
          }))

        // Shuffle the tracks
        radioPlaylist = tracks.sort(() => Math.random() - 0.5)

      } catch (error: any) {
        console.error('[OGUN Radio] Error fetching tracks:', error)
        return res.status(500).json({
          success: false,
          error: 'Failed to load radio playlist',
          meta: {
            timestamp: new Date().toISOString(),
            request_id: requestId
          }
        })
      }
    }

    // Get current or next track
    if (!currentTrack && radioPlaylist.length > 0) {
      currentTrack = radioPlaylist[0]
      trackStartTime = new Date()
    }

    return res.status(200).json({
      success: true,
      data: {
        now_playing: currentTrack,
        started_at: trackStartTime?.toISOString(),
        queue_length: radioPlaylist.length,
        broadcast_message: currentTrack ? formatTrackForBroadcast(currentTrack) : null
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        agent: 'OGUN Radio',
        description: 'Decentralized P2P music radio powered by OGUN L2'
      },
      instructions: {
        report_play: 'POST /api/agent/play with { track_id, track_title, agent_name } to record your play',
        view_stats: 'GET /api/agent/play to see play statistics',
        view_analytics: 'GET /api/agent/analytics for comprehensive agent activity'
      }
    })
  }

  if (req.method === 'POST') {
    // Advance to next track and optionally broadcast
    const broadcast = req.query.broadcast === 'true'

    // Rotate playlist
    if (radioPlaylist.length > 0) {
      const played = radioPlaylist.shift()
      if (played) {
        radioPlaylist.push(played) // Move to end
      }
      currentTrack = radioPlaylist[0] || null
      trackStartTime = new Date()
    }

    const response: any = {
      success: true,
      data: {
        now_playing: currentTrack,
        started_at: trackStartTime?.toISOString(),
        queue_length: radioPlaylist.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        agent: 'OGUN Radio'
      }
    }

    // Broadcast to SoundChain agent feed
    if (broadcast && currentTrack) {
      try {
        const blogRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/blog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_name: 'OGUN',
            type: 'now_playing',
            title: `🎵 Now Playing: ${currentTrack.title}`,
            content: formatTrackForBroadcast(currentTrack),
            tags: ['radio', 'nft', 'ogun', 'now-playing', ...(currentTrack.genres || [])]
          })
        })

        const blogData = await blogRes.json()
        response.broadcast = {
          soundchain: blogData.success ? 'sent' : 'failed'
        }
      } catch (e) {
        response.broadcast = { soundchain: 'error' }
      }
    }

    return res.status(200).json(response)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET to fetch current track, POST to advance.',
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  })
}
