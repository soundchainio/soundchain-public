import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * GET /api/youtube/stream?v={videoId}
 *
 * Returns the best available video stream URL for a YouTube video via Piped API.
 * This bypasses YouTube's embed restrictions (age-gated, region-blocked, etc.)
 * by fetching the direct stream URL from open-source Piped instances.
 *
 * Returns: { videoUrl, audioUrl, title, thumbnail, duration, uploader }
 */

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
]

const pipedFetch = async (path: string, signal: AbortSignal): Promise<any> => {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}${path}`, {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const videoId = req.query.v as string
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const data = await pipedFetch(`/streams/${videoId}`, controller.signal)
    clearTimeout(timeout)

    // Pick best video stream (prefer 720p mp4, fallback to any mp4)
    const videoStreams: any[] = data.videoStreams || []
    const audioStreams: any[] = data.audioStreams || []

    // Best video: 720p mp4 > any 720p > any mp4 > first available
    const best720mp4 = videoStreams.find((s: any) => s.quality === '720p' && s.mimeType?.includes('video/mp4'))
    const best720 = videoStreams.find((s: any) => s.quality === '720p')
    const bestMp4 = videoStreams.find((s: any) => s.mimeType?.includes('video/mp4'))
    // For video+audio combined streams (videoOnly=false means it has audio track)
    const combined = videoStreams.filter((s: any) => !s.videoOnly)
    const bestCombined = combined.find((s: any) => s.quality === '720p') || combined.find((s: any) => s.mimeType?.includes('video/mp4')) || combined[0]

    const videoStream = bestCombined || best720mp4 || best720 || bestMp4 || videoStreams[0]

    // Best audio: highest bitrate m4a/mp4 for widest browser support
    const bestAudio = audioStreams
      .filter((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0] || audioStreams[0]

    if (!videoStream && !bestAudio) {
      return res.status(404).json({ error: 'No streams available for this video' })
    }

    // Cache for 1 hour (stream URLs expire after a few hours)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')

    return res.status(200).json({
      videoUrl: videoStream?.url || null,
      audioUrl: bestAudio?.url || null,
      title: data.title || null,
      thumbnail: data.thumbnailUrl || null,
      duration: data.duration || null,
      uploader: data.uploader || null,
      uploaderAvatar: data.uploaderAvatar || null,
    })
  } catch (err: any) {
    clearTimeout(timeout)
    console.error('[youtube/stream] Error:', err?.message)
    return res.status(502).json({ error: 'Failed to fetch stream', message: err?.message })
  }
}
