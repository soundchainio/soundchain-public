import type { NextApiRequest, NextApiResponse } from 'next'
import ytdl from '@distube/ytdl-core'

/**
 * GET /api/youtube/stream?v={videoId}
 *
 * Returns the best available video stream URL for a YouTube video.
 * Primary: ytdl-core (talks directly to YouTube's InnerTube API — no external deps)
 * Fallback: Piped/Invidious open-source proxy instances
 *
 * This bypasses YouTube's embed restrictions (age-gated, region-blocked, etc.)
 * by extracting direct stream URLs that play in native <video> elements.
 *
 * Returns: { videoUrl, audioUrl, title, thumbnail, duration, uploader }
 */

// --- Primary: ytdl-core (direct YouTube InnerTube API) ---

// Build ytdl agent with YouTube cookies if available (needed for age-restricted content).
// Set YOUTUBE_COOKIES env var in Vercel as a JSON array of cookie objects:
// [{"name":"SID","value":"...","domain":".youtube.com"},{"name":"HSID","value":"...","domain":".youtube.com"}, ...]
// Or as a Netscape cookie string (one cookie per line: domain\tTRUE\t/\tTRUE\t0\tname\tvalue)
let ytdlAgent: any = undefined
try {
  const cookieEnv = process.env.YOUTUBE_COOKIES
  if (cookieEnv) {
    const cookies = JSON.parse(cookieEnv)
    ytdlAgent = ytdl.createAgent(cookies)
  }
} catch {
  // Invalid cookie format — proceed without auth
}

const tryYtdl = async (videoId: string): Promise<any> => {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const opts: any = {}
    if (ytdlAgent) opts.agent = ytdlAgent
    const info = await ytdl.getInfo(url, opts)

    const formats = (info.formats || []).filter((f: any) => f.url)
    if (formats.length === 0) return null

    // Prefer combined (audio+video) streams for simplest playback
    const combined = formats.filter((f: any) => f.hasAudio && f.hasVideo)
    const combinedMp4 = combined.filter((f: any) => f.container === 'mp4')
    const bestCombined = combinedMp4.find((f: any) => f.qualityLabel === '720p')
      || combined.find((f: any) => f.qualityLabel === '720p')
      || combinedMp4.sort((a: any, b: any) => (b.height || 0) - (a.height || 0))[0]
      || combined.sort((a: any, b: any) => (b.height || 0) - (a.height || 0))[0]

    // Also find best video-only (higher quality available than combined)
    const videoOnly = formats.filter((f: any) => f.hasVideo && !f.hasAudio && f.container === 'mp4')
    const bestVideoOnly = videoOnly.find((f: any) => f.qualityLabel === '720p')
      || videoOnly.sort((a: any, b: any) => (b.height || 0) - (a.height || 0))[0]

    // Best audio-only: highest bitrate
    const audioOnly = formats.filter((f: any) => f.hasAudio && !f.hasVideo)
    const bestAudio = audioOnly
      .sort((a: any, b: any) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0]

    // Use combined stream if available (simplest — single <video> src).
    // Otherwise fall back to video-only (client would need separate audio, but at least video works).
    const videoStream = bestCombined || bestVideoOnly
    if (!videoStream && !bestAudio) return null

    return {
      source: 'ytdl',
      videoUrl: videoStream?.url || null,
      audioUrl: bestAudio?.url || null,
      title: info.videoDetails?.title || null,
      thumbnail: info.videoDetails?.thumbnails?.slice(-1)[0]?.url || null,
      duration: parseInt(info.videoDetails?.lengthSeconds || '0') || null,
      uploader: info.videoDetails?.author?.name || null,
    }
  } catch (err: any) {
    console.error('[youtube/stream] ytdl-core error:', err?.message?.slice(0, 200))
    return null
  }
}

// --- Fallback: Piped API instances ---

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
]

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
      if (!data.videoStreams && !data.audioStreams) continue

      const videoStreams: any[] = data.videoStreams || []
      const audioStreams: any[] = data.audioStreams || []
      const combined = videoStreams.filter((s: any) => !s.videoOnly)
      const bestCombined = combined.find((s: any) => s.quality === '720p') || combined.find((s: any) => s.mimeType?.includes('video/mp4')) || combined[0]
      const bestMp4 = videoStreams.find((s: any) => s.mimeType?.includes('video/mp4'))
      const videoStream = bestCombined || bestMp4 || videoStreams[0]
      const bestAudio = audioStreams
        .filter((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm'))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0] || audioStreams[0]

      return {
        source: 'piped',
        videoUrl: videoStream?.url || null,
        audioUrl: bestAudio?.url || null,
        title: data.title || null,
        thumbnail: data.thumbnailUrl || null,
        duration: data.duration || null,
        uploader: data.uploader || null,
      }
    } catch { /* next instance */ }
  }
  return null
}

const tryInvidious = async (videoId: string, signal: AbortSignal): Promise<any> => {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}?fields=title,adaptiveFormats,author,lengthSeconds,videoThumbnails`, {
        headers: { 'User-Agent': 'SoundChain/1.0' },
        signal,
      })
      if (!res.ok) continue
      const text = await res.text()
      if (text.startsWith('<!') || text.startsWith('<') || text.includes('shutdown')) continue
      const data = JSON.parse(text)
      const formats: any[] = data?.adaptiveFormats || []
      if (formats.length === 0) continue

      const videos = formats.filter((f: any) => f.type?.startsWith('video/'))
      const audios = formats.filter((f: any) => f.type?.startsWith('audio/'))
      const best720 = videos.find((f: any) => f.qualityLabel === '720p' && f.type?.includes('mp4'))
      const bestMp4 = videos.find((f: any) => f.type?.includes('mp4'))
      const bestAudio = audios
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]

      return {
        source: 'invidious',
        videoUrl: (best720 || bestMp4 || videos[0])?.url || null,
        audioUrl: bestAudio?.url || null,
        title: data.title || null,
        thumbnail: data.videoThumbnails?.[0]?.url || null,
        duration: data.lengthSeconds || null,
        uploader: data.author || null,
      }
    } catch { /* next instance */ }
  }
  return null
}

// --- Handler ---

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const videoId = req.query.v as string
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' })
  }

  try {
    // 1. Try ytdl-core first (direct YouTube API, no external deps)
    const ytdlResult = await tryYtdl(videoId)
    if (ytdlResult?.videoUrl || ytdlResult?.audioUrl) {
      // Cache for 4 hours (ytdl stream URLs are valid for ~6 hours)
      res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=3600')
      return res.status(200).json(ytdlResult)
    }

    // 2. Fallback to Piped/Invidious proxy instances
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const proxyResult = await tryPiped(videoId, controller.signal) || await tryInvidious(videoId, controller.signal)
    clearTimeout(timeout)

    if (proxyResult?.videoUrl || proxyResult?.audioUrl) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
      return res.status(200).json(proxyResult)
    }

    return res.status(404).json({ error: 'No streams available for this video' })
  } catch (err: any) {
    console.error('[youtube/stream] Error:', err?.message)
    return res.status(502).json({ error: 'Failed to fetch stream', message: err?.message })
  }
}
