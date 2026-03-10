import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/playlist/import-url
 *
 * Accepts a platform playlist URL and returns extracted tracks.
 * Supported: YouTube playlists (via RSS feed — no API key needed).
 *
 * Body: { url: string }
 * Returns: { tracks: Array<{ title: string; url: string; thumbnail: string | null }>, platform: string, total: number }
 */

interface ImportedTrack {
  title: string
  url: string
  thumbnail: string | null
}

// Extract playlist ID from YouTube URL
const extractYouTubePlaylistId = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('list')
  } catch {
    return null
  }
}

// Fetch YouTube playlist tracks via public RSS feed (no API key required)
const fetchYouTubePlaylist = async (playlistId: string): Promise<ImportedTrack[]> => {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`

  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'SoundChain/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error(`YouTube RSS returned ${res.status}`)
  }

  const xml = await res.text()
  const tracks: ImportedTrack[] = []

  // Parse XML entries — extract <title>, <yt:videoId>, and thumbnail
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

      const tracks = await fetchYouTubePlaylist(playlistId)

      return res.status(200).json({
        platform: 'YouTube',
        tracks,
        total: tracks.length,
        note: tracks.length >= 15 ? 'YouTube RSS feeds return up to 15 tracks. For larger playlists, add the playlist URL directly as an external link.' : undefined,
      })
    }

    // Spotify — would need Spotify Web API credentials (future)
    if (hostname.includes('spotify.com')) {
      return res.status(400).json({
        error: 'Spotify playlist import coming soon. For now, add the Spotify playlist URL directly — it will embed with full playback.',
        platform: 'Spotify',
      })
    }

    // SoundCloud — API deprecated (future)
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
