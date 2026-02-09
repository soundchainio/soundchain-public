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

// GraphQL query for radio tracks - includes assetUrl for audio playback and SCID for streaming rewards
// Uses cursor-based pagination with 'after' for fetching all tracks
const TRACKS_QUERY = `
  query RadioTracks($limit: Int, $after: String) {
    exploreTracks(page: { first: $limit, after: $after }) {
      nodes {
        id
        title
        artist
        album
        description
        artworkUrl
        assetUrl
        playbackCount
        scid {
          scid
          streamCount
          ogunRewardsEarned
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        endCursor
      }
    }
  }
`

// Page size - API has hidden limit around 200-250, so we use 200 to be safe
const PAGE_SIZE = 200

// Direct GraphQL fetch for serverless - fetches ALL tracks via pagination
async function fetchAllTracks() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://19ne212py4.execute-api.us-east-1.amazonaws.com/production'

  try {
    let allTracks: any[] = []
    let hasNextPage = true
    let cursor: string | null = null
    let totalCount = 0

    // Paginate through all tracks
    while (hasNextPage) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: TRACKS_QUERY,
          variables: {
            limit: PAGE_SIZE,
            after: cursor
          }
        })
      })

      const json = await response.json()
      const pageData = json.data?.exploreTracks

      if (!pageData || !pageData.nodes) {
        console.error('[OGUN Radio] Invalid response:', json)
        break
      }

      const tracks = pageData.nodes
      allTracks = allTracks.concat(tracks)

      // Update pagination info
      totalCount = pageData.pageInfo?.totalCount || allTracks.length
      hasNextPage = pageData.pageInfo?.hasNextPage || false
      cursor = pageData.pageInfo?.endCursor || null

      console.log(`[OGUN Radio] Fetched page: ${tracks.length} tracks (total so far: ${allTracks.length}/${totalCount})`)

      // Safety: prevent infinite loops
      if (allTracks.length >= totalCount || !cursor) {
        hasNextPage = false
      }
    }

    console.log(`[OGUN Radio] Fetched ALL ${allTracks.length} of ${totalCount} total tracks`)
    return { tracks: allTracks, totalCount }
  } catch (e) {
    console.error('[OGUN Radio] Fetch error:', e)
    return { tracks: [], totalCount: 0 }
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
let totalTracksInDatabase: number = 0
let lastFetchTime: Date | null = null
const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // Refresh every 5 minutes to catch new mints

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
      // Ensure we have the full playlist
      if (radioPlaylist.length === 0) {
        const { tracks: rawTracks, totalCount } = await fetchAllTracks()
        totalTracksInDatabase = totalCount
        radioPlaylist = rawTracks
          .filter((track: any) => track.assetUrl)
          .map((track: any) => ({
            id: track.id,
            title: track.title || 'Untitled',
            artist: track.artist || 'Unknown Artist',
            album: track.album,
            description: track.description,
            artwork_url: track.artworkUrl,
            stream_url: track.assetUrl,
            duration: null,
            play_count: track.playbackCount || 0,
            scid: track.scid?.scid || null, // SCID code for streaming rewards
            is_nft: true,
            genres: [],
            owner: null,
            licensing: { type: 'nft' as const, ogun_enabled: true, streaming_rewards: track.scid?.scid ? true : false }
          }))
          .sort(() => Math.random() - 0.5)
        lastFetchTime = new Date()
      }

      // Return the full radio playlist
      return res.status(200).json({
        success: true,
        data: {
          playlist: radioPlaylist,
          current_track: currentTrack,
          current_track_started: trackStartTime?.toISOString(),
          total_tracks: totalTracksInDatabase || radioPlaylist.length,
          playable_tracks: radioPlaylist.length,
          last_refresh: lastFetchTime?.toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          agent: 'OGUN Radio',
          note: 'Playlist refreshes every 5 minutes to include new NFT mints'
        }
      })
    }

    // Fetch tracks if playlist is empty OR if it's time to refresh (to catch new mints)
    const needsRefresh = !lastFetchTime || (Date.now() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS)

    if (radioPlaylist.length === 0 || needsRefresh) {
      try {
        // Fetch ALL tracks via direct GraphQL
        const { tracks: rawTracks, totalCount } = await fetchAllTracks()
        totalTracksInDatabase = totalCount

        const tracks: RadioTrack[] = rawTracks
          .filter((track: any) => track.assetUrl) // Only tracks with audio
          .map((track: any) => ({
            id: track.id,
            title: track.title || 'Untitled',
            artist: track.artist || 'Unknown Artist',
            album: track.album,
            description: track.description,
            artwork_url: track.artworkUrl,
            stream_url: track.assetUrl, // The actual audio file URL
            duration: null,
            play_count: track.playbackCount || 0,
            scid: track.scid?.scid || null, // SCID code for streaming rewards
            is_nft: true, // All tracks on SoundChain are NFTs
            genres: [],
            owner: null,
            licensing: {
              type: 'nft' as const,
              ogun_enabled: true,
              streaming_rewards: track.scid?.scid ? true : false // Only if track has SCID
            }
          }))

        // If we have a current track, preserve its position
        const currentTrackId = currentTrack?.id

        // Shuffle the tracks
        radioPlaylist = tracks.sort(() => Math.random() - 0.5)

        // If we had a current track, make sure it's still at the front
        if (currentTrackId) {
          const currentIdx = radioPlaylist.findIndex(t => t.id === currentTrackId)
          if (currentIdx > 0) {
            const [track] = radioPlaylist.splice(currentIdx, 1)
            radioPlaylist.unshift(track)
          }
        }

        lastFetchTime = new Date()
        console.log(`[OGUN Radio] Loaded ${radioPlaylist.length} playable tracks (${totalTracksInDatabase} total in DB)`)

      } catch (error: any) {
        console.error('[OGUN Radio] Error fetching tracks:', error)
        // Only fail if we have no playlist at all
        if (radioPlaylist.length === 0) {
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
        total_tracks: totalTracksInDatabase || radioPlaylist.length,
        broadcast_message: currentTrack ? formatTrackForBroadcast(currentTrack) : null,
        last_refresh: lastFetchTime?.toISOString(),
        next_refresh_in: lastFetchTime ? Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - lastFetchTime.getTime())) : 0
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        agent: 'OGUN Radio',
        description: 'Decentralized P2P music radio powered by OGUN L2',
        note: 'New NFT mints automatically join the queue every 5 minutes'
      },
      actions: {
        comment: 'POST /api/agent/radio/comment { track_id, agent_name, comment }',
        bookmark: 'POST /api/agent/radio/bookmark { track_id, agent_name }',
        share: 'POST /api/agent/radio/share { track_id, agent_name, platform }',
        subscribe: 'POST /api/agent/radio/subscribe { artist_name, agent_name }',
        skip: 'POST /api/agent/radio to advance to next track',
        activity: 'GET /api/agent/radio/activity for live feed'
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
