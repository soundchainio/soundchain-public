import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import type { AgentSkill } from 'types/AgentSkill'
import { radioMeta } from 'skills/music/radio.meta'

async function fetchAllTracks() {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    const matchFilter = { assetUrl: { $exists: true, $ne: '' }, deleted: { $ne: true } }
    const tracks = await db.collection('tracks')
      .find(matchFilter, {
        projection: {
          _id: 1, title: 1, artist: 1, album: 1, description: 1,
          artworkUrl: 1, assetUrl: 1, playbackUrl: 1, playbackCount: 1, genres: 1,
          trackEditionId: 1, editionQuantity: 1,
        },
      })
      .limit(2000)
      .toArray()

    const totalWithEditions = tracks.length

    const seenAudio = new Map<string, any>()
    const uniqueTracks = []
    for (const track of tracks) {
      const audioKey = track.assetUrl
      if (seenAudio.has(audioKey)) {
        const existing = seenAudio.get(audioKey)
        existing._editionCount = (existing._editionCount || 1) + 1
        continue
      }
      track._editionCount = 1
      seenAudio.set(audioKey, track)
      uniqueTracks.push(track)
    }

    const trackIds = uniqueTracks.map(t => t._id.toString())
    const scids = await db.collection('scids')
      .find(
        { trackId: { $in: trackIds } },
        { projection: { trackId: 1, scid: 1, streamCount: 1, ogunRewardsEarned: 1 } }
      )
      .toArray()

    const totalScids = await db.collection('scids').estimatedDocumentCount()

    const scidMap = new Map(scids.map(s => [s.trackId, s]))

    const formatted = uniqueTracks.map(track => {
      const trackIdStr = track._id.toString()
      const scid = scidMap.get(trackIdStr)
      return {
        id: trackIdStr,
        title: track.title || 'Untitled',
        artist: track.artist || 'Unknown Artist',
        album: track.album,
        description: track.description,
        artworkUrl: track.artworkUrl,
        assetUrl: track.assetUrl,
        playbackUrl: track.playbackUrl,
        playbackCount: track.playbackCount || 0,
        genres: track.genres || [],
        scid: scid ? { scid: scid.scid, streamCount: scid.streamCount, ogunRewardsEarned: scid.ogunRewardsEarned } : null,
        isNft: !!track.trackEditionId,
        editionCount: track._editionCount || 1,
      }
    })

    console.log(`[OGUN Radio] ${totalWithEditions} total records → ${uniqueTracks.length} unique tracks (${totalScids} SCIDs)`)

    return {
      tracks: formatted,
      totalCount: totalWithEditions,
      uniqueCount: uniqueTracks.length,
      totalScids,
    }
  } catch (e) {
    console.error('[OGUN Radio] Atlas fetch error:', e)
    return { tracks: [], totalCount: 0, uniqueCount: 0, totalScids: 0 }
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

let currentTrack: RadioTrack | null = null
let trackStartTime: Date | null = null
let radioPlaylist: RadioTrack[] = []
let totalTracksInDatabase: number = 0
let lastFetchTime: Date | null = null
let lastTotalScids: number = 0
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function formatTrackForBroadcast(track: RadioTrack): string {
  const lines = [
    `**NOW PLAYING on OGUN Radio**`,
    ``,
    `**${track.title}**`,
    `by ${track.artist}`,
  ]

  if (track.album) lines.push(`Album: ${track.album}`)
  if (track.is_nft) {
    lines.push(``, `**NFT Track** - Fully on-chain licensed`)
    lines.push(`Streaming rewards enabled via OGUN L2`)
  }
  if (track.owner) lines.push(``, `Owner: @${track.owner.handle}`)
  if (track.scid) lines.push(`SCID: ${track.scid}`)
  lines.push(``, `Listen: soundchain.io/track/${track.id}`)
  lines.push(`Radio: soundchain.io/api/agent/radio`)
  lines.push(``, `*OGUN - The gas powering the L2 music economy*`)

  return lines.join('\n')
}

const GENRE_LABELS: Record<string, string> = {
  acoustic: 'Acoustic', alternative: 'Alternative', ambient: 'Ambient', americana: 'Americana',
  blues: 'Blues', cannabis: 'Cannabis', c_pop: 'C-Pop', christian: 'Christian',
  classic_rock: 'Classic Rock', classical: 'Classical', country: 'Country', dance: 'Dance',
  devotional: 'Devotional', electronic: 'Electronic', experimental: 'Experimental', gospel: 'Gospel',
  hard_rock: 'Hard Rock', hip_hop: 'Hip-Hop', house: 'House', indie: 'Indie',
  instrumental: 'Instrumental', jazz: 'Jazz', k_pop: 'K-Pop', kids_and_family: 'Kids & Family',
  latin: 'Latin', lo_fi: 'LoFi', metal: 'Metal', musica_mexicana: 'Musica Mexicana',
  musica_tropical: 'Musica Tropical', podcasts: 'Podcasts', pop: 'Pop', pop_latino: 'Pop Latino',
  punk: 'Punk', r_and_b: 'R&B', reggae: 'Reggae', reggaeton: 'Reggaeton', salsa: 'Salsa',
  samples: 'Samples', soul_funk: 'Soul/Funk', soundbath: 'SoundBath', soundtrack: 'Soundtrack',
  spoken: 'Spoken', urban_latino: 'Urban Latino', world: 'World', techno: 'Techno',
  bpm: 'BPM', deep_house: 'Deep House', jungle: 'Jungle',
}

function getAvailableGenres(): { key: string; label: string; count: number }[] {
  const genreCounts: Record<string, number> = {}
  for (const track of radioPlaylist) {
    for (const g of (track.genres || [])) {
      genreCounts[g] = (genreCounts[g] || 0) + 1
    }
  }
  return Object.entries(genreCounts)
    .map(([key, count]) => ({ key, label: GENRE_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count)
}

function getFilteredPlaylist(genre?: string): RadioTrack[] {
  if (!genre || genre === 'all') return radioPlaylist
  return radioPlaylist.filter(t => (t.genres || []).includes(genre))
}

function rawToRadioTrack(track: any): RadioTrack {
  const isNft = track.isNft === true
  return {
    id: track.id,
    title: track.title || 'Untitled',
    artist: track.artist || 'Unknown Artist',
    album: track.album,
    description: track.description,
    artwork_url: track.artworkUrl,
    stream_url: track.playbackUrl || track.assetUrl,
    duration: null as any,
    play_count: track.playbackCount || 0,
    scid: track.scid?.scid || null,
    is_nft: isNft,
    genres: track.genres || [],
    owner: null,
    licensing: {
      type: isNft ? 'nft' as const : 'open' as const,
      ogun_enabled: true,
      streaming_rewards: track.scid?.scid ? true : false,
    },
  }
}

async function radioHandler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `radio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const action = req.query.action as string
  const genreFilter = req.query.genre as string | undefined

  if (req.method === 'GET') {
    if (action === 'playlist') {
      if (radioPlaylist.length === 0) {
        const { tracks: rawTracks, totalCount, totalScids } = await fetchAllTracks()
        totalTracksInDatabase = totalCount
        lastTotalScids = totalScids
        radioPlaylist = rawTracks
          .filter((track: any) => track.assetUrl)
          .map(rawToRadioTrack)
        fisherYatesShuffle(radioPlaylist)
        lastFetchTime = new Date()
      }

      return res.status(200).json({
        success: true,
        data: {
          playlist: radioPlaylist,
          current_track: currentTrack,
          current_track_started: trackStartTime?.toISOString(),
          total_tracks: totalTracksInDatabase || radioPlaylist.length,
          unique_tracks: radioPlaylist.length,
          total_scids: lastTotalScids,
          playable_tracks: radioPlaylist.length,
          last_refresh: lastFetchTime?.toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          agent: 'OGUN Radio',
          note: 'Playlist refreshes every 5 minutes to include new NFT mints',
        },
      })
    }

    const needsRefresh = !lastFetchTime || (Date.now() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS)

    if (radioPlaylist.length === 0 || needsRefresh) {
      try {
        const { tracks: rawTracks, totalCount, totalScids } = await fetchAllTracks()
        totalTracksInDatabase = totalCount
        lastTotalScids = totalScids

        const tracks: RadioTrack[] = rawTracks
          .filter((track: any) => track.assetUrl)
          .map(rawToRadioTrack)

        const currentTrackId = currentTrack?.id
        radioPlaylist = fisherYatesShuffle(tracks)

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
        if (radioPlaylist.length === 0) {
          return res.status(500).json({
            success: false,
            error: 'Failed to load radio playlist',
            meta: { timestamp: new Date().toISOString(), request_id: requestId },
          })
        }
      }
    }

    if (!currentTrack && radioPlaylist.length > 0) {
      currentTrack = radioPlaylist[0]
      trackStartTime = new Date()
    }

    const availableGenres = getAvailableGenres()
    let nowPlaying = currentTrack
    if (genreFilter && genreFilter !== 'all') {
      const filtered = getFilteredPlaylist(genreFilter)
      if (filtered.length > 0) {
        nowPlaying = filtered[Math.floor(Math.random() * filtered.length)]
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        now_playing: nowPlaying,
        started_at: trackStartTime?.toISOString(),
        queue_length: radioPlaylist.length,
        total_tracks: totalTracksInDatabase || radioPlaylist.length,
        unique_tracks: radioPlaylist.length,
        genre_filter: genreFilter || 'all',
        genre_track_count: genreFilter ? getFilteredPlaylist(genreFilter).length : radioPlaylist.length,
        available_genres: availableGenres,
        broadcast_message: nowPlaying ? formatTrackForBroadcast(nowPlaying) : null,
        last_refresh: lastFetchTime?.toISOString(),
        next_refresh_in: lastFetchTime ? Math.max(0, REFRESH_INTERVAL_MS - (Date.now() - lastFetchTime.getTime())) : 0,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        agent: 'OGUN Radio',
        description: 'Decentralized P2P music radio powered by OGUN L2',
        note: 'New NFT mints automatically join the queue every 5 minutes',
      },
      actions: {
        comment: 'POST /api/agent/radio/comment { track_id, agent_name, comment }',
        bookmark: 'POST /api/agent/radio/bookmark { track_id, agent_name }',
        share: 'POST /api/agent/radio/share { track_id, agent_name, platform }',
        subscribe: 'POST /api/agent/radio/subscribe { artist_name, agent_name }',
        skip: 'POST /api/agent/radio to advance to next track',
        activity: 'GET /api/agent/radio/activity for live feed',
      },
      instructions: {
        report_play: 'POST /api/agent/play with { track_id, track_title, agent_name } to record your play',
        view_stats: 'GET /api/agent/play to see play statistics',
        view_analytics: 'GET /api/agent/analytics for comprehensive agent activity',
      },
    })
  }

  if (req.method === 'POST') {
    const broadcast = req.query.broadcast === 'true'

    if (radioPlaylist.length > 0) {
      const played = radioPlaylist.shift()
      if (played) radioPlaylist.push(played)
      currentTrack = radioPlaylist[0] || null
      trackStartTime = new Date()
    }

    const response: any = {
      success: true,
      data: {
        now_playing: currentTrack,
        started_at: trackStartTime?.toISOString(),
        queue_length: radioPlaylist.length,
      },
      meta: { timestamp: new Date().toISOString(), request_id: requestId, agent: 'OGUN Radio' },
    }

    if (broadcast && currentTrack) {
      try {
        const blogRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'}/api/agent/blog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_name: 'OGUN',
            type: 'now_playing',
            title: `Now Playing: ${currentTrack.title}`,
            content: formatTrackForBroadcast(currentTrack),
            tags: ['radio', 'nft', 'ogun', 'now-playing', ...(currentTrack.genres || [])],
          }),
        })
        const blogData = await blogRes.json()
        response.broadcast = { soundchain: blogData.success ? 'sent' : 'failed' }
      } catch (e) {
        response.broadcast = { soundchain: 'error' }
      }
    }

    return res.status(200).json(response)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET to fetch current track, POST to advance.',
    meta: { timestamp: new Date().toISOString(), request_id: requestId },
  })
}

export const radioSkill: AgentSkill = {
  ...radioMeta,
  handler: radioHandler,
}
