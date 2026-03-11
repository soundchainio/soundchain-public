import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * GET /api/youtube/stream?v={videoId}
 *
 * Returns the best available video stream URL for a YouTube video.
 * Tries Piped API instances first, then falls back to Invidious API.
 * This bypasses YouTube's embed restrictions (age-gated, region-blocked, etc.)
 * by fetching the direct stream URL from open-source proxy instances.
 *
 * Returns: { videoUrl, audioUrl, title, thumbnail, duration, uploader }
 */

// Piped API instances (endpoint: /streams/{videoId})
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
]

// Invidious API instances (endpoint: /api/v1/videos/{videoId})
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.io.lol',
  'https://inv.tux.pizza',
  'https://invidious.protokoll.cc',
]

const tryPiped = async (videoId: string, signal: AbortSignal): Promise<any> => {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: { 'User-Agent': 'SoundChain/1.0' },
        signal,
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data?.error || data?.message?.includes('shutdown')) continue
      if (data.videoStreams || data.audioStreams) return { source: 'piped', data }
    } catch {
      // Try next instance
    }
  }
  return null
}

const tryInvidious = async (videoId: string, signal: AbortSignal): Promise<any> => {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}?fields=title,adaptiveFormats,author,authorThumbnails,lengthSeconds,videoThumbnails`, {
        headers: { 'User-Agent': 'SoundChain/1.0' },
        signal,
      })
      if (!res.ok) continue
      const text = await res.text()
      // Skip HTML error pages or shutdown notices
      if (text.startsWith('<!') || text.startsWith('<') || text.includes('shutdown')) continue
      const data = JSON.parse(text)
      if (data?.adaptiveFormats?.length > 0) return { source: 'invidious', data }
    } catch {
      // Try next instance
    }
  }
  return null
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
  const timeout = setTimeout(() => controller.abort(), 12000) // 12s timeout

  try {
    // Try Piped first, then Invidious
    const result = await tryPiped(videoId, controller.signal) || await tryInvidious(videoId, controller.signal)
    clearTimeout(timeout)

    if (!result) {
      return res.status(502).json({ error: 'All proxy instances failed' })
    }

    let videoUrl: string | null = null
    let audioUrl: string | null = null
    let title: string | null = null
    let thumbnail: string | null = null
    let duration: number | null = null
    let uploader: string | null = null

    if (result.source === 'piped') {
      const data = result.data
      const videoStreams: any[] = data.videoStreams || []
      const audioStreams: any[] = data.audioStreams || []

      // Best video: combined (has audio) > 720p mp4 > any mp4 > first
      const combined = videoStreams.filter((s: any) => !s.videoOnly)
      const bestCombined = combined.find((s: any) => s.quality === '720p') || combined.find((s: any) => s.mimeType?.includes('video/mp4')) || combined[0]
      const best720mp4 = videoStreams.find((s: any) => s.quality === '720p' && s.mimeType?.includes('video/mp4'))
      const bestMp4 = videoStreams.find((s: any) => s.mimeType?.includes('video/mp4'))
      const videoStream = bestCombined || best720mp4 || bestMp4 || videoStreams[0]

      // Best audio: highest bitrate mp4/webm
      const bestAudio = audioStreams
        .filter((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm'))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0] || audioStreams[0]

      videoUrl = videoStream?.url || null
      audioUrl = bestAudio?.url || null
      title = data.title || null
      thumbnail = data.thumbnailUrl || null
      duration = data.duration || null
      uploader = data.uploader || null
    } else if (result.source === 'invidious') {
      const data = result.data
      const formats: any[] = data.adaptiveFormats || []

      // Best video: combined mp4 720p > any mp4 > first video
      const videos = formats.filter((f: any) => f.type?.startsWith('video/'))
      const audios = formats.filter((f: any) => f.type?.startsWith('audio/'))
      const best720 = videos.find((f: any) => f.qualityLabel === '720p' && f.type?.includes('mp4'))
      const bestMp4 = videos.find((f: any) => f.type?.includes('mp4'))
      const videoStream = best720 || bestMp4 || videos[0]

      const bestAudio = audios
        .filter((f: any) => f.type?.includes('mp4') || f.type?.includes('webm'))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0] || audios[0]

      videoUrl = videoStream?.url || null
      audioUrl = bestAudio?.url || null
      title = data.title || null
      thumbnail = data.videoThumbnails?.[0]?.url || null
      duration = data.lengthSeconds || null
      uploader = data.author || null
    }

    if (!videoUrl && !audioUrl) {
      return res.status(404).json({ error: 'No streams available for this video' })
    }

    // Cache for 1 hour (stream URLs expire after a few hours)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')

    return res.status(200).json({ videoUrl, audioUrl, title, thumbnail, duration, uploader })
  } catch (err: any) {
    clearTimeout(timeout)
    console.error('[youtube/stream] Error:', err?.message)
    return res.status(502).json({ error: 'Failed to fetch stream', message: err?.message })
  }
}
