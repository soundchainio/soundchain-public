import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/playlist/import-url
 *
 * Accepts a platform playlist URL and returns ALL extracted tracks (unlimited).
 * Supported: YouTube playlists (via Piped API — no API key, full pagination).
 *
 * Body: { url: string }
 * Returns: { tracks: Array<{ title: string; url: string; thumbnail: string | null }>, platform: string, total: number }
 */

interface ImportedTrack {
  title: string
  url: string
  thumbnail: string | null
}

// Piped API instances (open source YouTube proxies — no API key needed)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
]

// Extract playlist ID from YouTube URL
const extractYouTubePlaylistId = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('list')
  } catch {
    return null
  }
}

// Fetch a single page from Piped API
const pipedFetch = async (url: string, signal: AbortSignal): Promise<any> => {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${url}`, {
        headers: { 'User-Agent': 'SoundChain/1.0' },
        signal,
      })
      if (res.ok) return await res.json()
    } catch {
      // Try next instance
    }
  }
  throw new Error('All Piped instances failed')
}

// Fetch ALL YouTube playlist tracks via Piped API with pagination (unlimited)
const fetchYouTubePlaylistFull = async (playlistId: string): Promise<ImportedTrack[]> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000) // 30s total timeout

  try {
    const tracks: ImportedTrack[] = []

    // First page
    const data = await pipedFetch(`/playlists/${playlistId}`, controller.signal)

    if (!data.relatedStreams || !Array.isArray(data.relatedStreams)) {
      throw new Error('Invalid playlist response')
    }

    for (const video of data.relatedStreams) {
      if (!video.url || !video.title) continue
      const videoId = video.url?.replace('/watch?v=', '')
      tracks.push({
        title: video.title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: video.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null),
      })
    }

    // Paginate through ALL remaining pages
    let nextpage = data.nextpage
    let pageCount = 1
    const MAX_PAGES = 100 // Safety cap: 100 pages * ~30 tracks = ~3000 tracks

    while (nextpage && pageCount < MAX_PAGES) {
      const pageData = await pipedFetch(
        `/nextpage/playlists/${playlistId}?nextpage=${encodeURIComponent(nextpage)}`,
        controller.signal,
      )

      if (!pageData.relatedStreams || !Array.isArray(pageData.relatedStreams)) break

      for (const video of pageData.relatedStreams) {
        if (!video.url || !video.title) continue
        const videoId = video.url?.replace('/watch?v=', '')
        tracks.push({
          title: video.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: video.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null),
        })
      }

      nextpage = pageData.nextpage
      pageCount++
    }

    return tracks
  } finally {
    clearTimeout(timeout)
  }
}

// Fallback: RSS feed (max 15 tracks)
const fetchYouTubePlaylistRSS = async (playlistId: string): Promise<ImportedTrack[]> => {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'SoundChain/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`YouTube RSS returned ${res.status}`)

  const xml = await res.text()
  const tracks: ImportedTrack[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
    const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)
    if (titleMatch && videoIdMatch) {
      const title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      const videoId = videoIdMatch[1].trim()
      tracks.push({
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      })
    }
  }
  return tracks
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // YouTube playlist
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const playlistId = extractYouTubePlaylistId(url)

      if (!playlistId) {
        return res.status(400).json({ error: 'Could not extract playlist ID. Make sure the URL contains ?list=...' })
      }

      // Try full import (Piped API — unlimited), fall back to RSS (15 max)
      let tracks: ImportedTrack[]
      let method: string

      try {
        tracks = await fetchYouTubePlaylistFull(playlistId)
        method = 'full'
      } catch (pipedErr: any) {
        console.warn('[playlist/import-url] Piped API failed, falling back to RSS:', pipedErr?.message)
        tracks = await fetchYouTubePlaylistRSS(playlistId)
        method = 'rss'
      }

      return res.status(200).json({
        platform: 'YouTube',
        tracks,
        total: tracks.length,
        note: method === 'rss' && tracks.length >= 15
          ? 'Fetched via fallback (max 15 tracks). Try again later for the full playlist.'
          : undefined,
      })
    }

    // Spotify — not supporting premium-gated platforms
    if (hostname.includes('spotify.com')) {
      return res.status(400).json({
        error: 'Spotify requires premium accounts. Add the Spotify playlist URL directly — it will embed with full playback.',
        platform: 'Spotify',
      })
    }

    // SoundCloud
    if (hostname.includes('soundcloud.com')) {
      return res.status(400).json({
        error: 'SoundCloud playlist import coming soon. For now, add the SoundCloud URL directly.',
        platform: 'SoundCloud',
      })
    }

    return res.status(400).json({ error: `Platform not supported for import yet. Supported: YouTube playlists.` })
  } catch (err: any) {
    console.error('[playlist/import-url] Error:', err?.message)
    return res.status(500).json({ error: 'Failed to import playlist. Please try again.' })
  }
}
