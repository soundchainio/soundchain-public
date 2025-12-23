import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { config } from 'config'

/**
 * oEmbed API Endpoint
 *
 * Two modes:
 * 1. SoundChain URLs → Returns oEmbed JSON for embedding SoundChain content (oEmbed Provider)
 * 2. External URLs → Returns thumbnail URL (oEmbed Proxy for fetching thumbnails)
 *
 * GET /api/oembed?url=https://soundchain.io/posts/123 → oEmbed JSON
 * GET /api/oembed?url=https://youtube.com/watch?v=xxx → { thumbnail_url: string }
 */

interface OEmbedResponse {
  type: 'video' | 'rich' | 'photo' | 'link'
  version: '1.0'
  title: string
  author_name?: string
  author_url?: string
  provider_name: string
  provider_url: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  html: string
  width: number
  height: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, maxwidth, maxheight, format } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Check if this is a SoundChain URL (oEmbed Provider mode)
  const isSoundChainUrl = url.includes('soundchain.io') ||
    url.includes('soundchain.fm') ||
    url.includes('localhost:3000')

  if (isSoundChainUrl) {
    return handleSoundChainOEmbed(req, res, url, maxwidth as string, maxheight as string, format as string)
  }

  // External URL - use thumbnail proxy mode
  try {
    const thumbnail = await fetchThumbnail(url)
    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).json({ thumbnail_url: thumbnail })
  } catch (error) {
    console.error('oEmbed fetch error:', error)
    return res.status(200).json({ thumbnail_url: null })
  }
}

/**
 * Handle oEmbed requests for SoundChain content
 */
async function handleSoundChainOEmbed(
  req: NextApiRequest,
  res: NextApiResponse,
  url: string,
  maxwidth?: string,
  maxheight?: string,
  format?: string
) {
  // Only support JSON format
  if (format && format !== 'json') {
    return res.status(501).json({ error: 'Only JSON format is supported' })
  }

  // Parse the URL to extract post/track ID
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  // Match post URLs: /posts/{id}
  const postMatch = pathname.match(/^\/posts\/([a-zA-Z0-9]+)/)
  // Match track URLs: /tracks/{id} or /dex/track/{id}
  const trackMatch = pathname.match(/^\/(?:tracks|dex\/track)\/([a-zA-Z0-9]+)/)

  if (!postMatch && !trackMatch) {
    return res.status(404).json({ error: 'URL not supported for embedding' })
  }

  const resourceId = postMatch ? postMatch[1] : trackMatch![1]
  const resourceType = postMatch ? 'post' : 'track'

  // Calculate dimensions
  const width = Math.min(parseInt(maxwidth || '640') || 640, 1280)
  const height = Math.min(parseInt(maxheight || '360') || 360, 720)

  // Build embed URL
  const domainUrl = config.domainUrl || 'https://soundchain.fm'
  const embedUrl = resourceType === 'post'
    ? `${domainUrl}/embed/post/${resourceId}`
    : `${domainUrl}/embed/track/${resourceId}`

  // Build oEmbed response
  const oembedResponse: OEmbedResponse = {
    type: 'video',
    version: '1.0',
    title: 'SoundChain',
    provider_name: 'SoundChain',
    provider_url: domainUrl,
    thumbnail_url: `${domainUrl}/soundchain-meta-logo.png`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    html: `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
    width,
    height,
  }

  // Set cache headers
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  res.setHeader('Content-Type', 'application/json')

  return res.status(200).json(oembedResponse)
}

async function fetchThumbnail(mediaLink: string): Promise<string | null> {
  // YouTube - direct URL (no API needed) - handles embed/, watch?v=, shorts/, youtu.be/
  if (mediaLink.includes('youtube.com') || mediaLink.includes('youtu.be')) {
    const match = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/)
    if (match) {
      // Try maxresdefault first, fallback to hqdefault
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
    }
  }

  // Spotify - handles embed URLs and regular URLs
  if (mediaLink.includes('spotify.com')) {
    // Match embed format: spotify.com/embed/track/xxx
    const embedMatch = mediaLink.match(/spotify\.com\/embed\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    // Match regular format: open.spotify.com/track/xxx
    const regularMatch = mediaLink.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    const match = embedMatch || regularMatch
    if (match) {
      const [, type, id] = match
      const originalUrl = `https://open.spotify.com/${type}/${id}`
      const response = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(originalUrl)}`, { timeout: 5000 })
      return response.data?.thumbnail_url || null
    }
  }

  // SoundCloud - handles embed URLs with url= parameter and regular URLs
  if (mediaLink.includes('soundcloud.com')) {
    let trackUrl = mediaLink

    // Extract URL from embed iframe src (w.soundcloud.com/player/?url=...)
    const urlMatch = mediaLink.match(/url=([^&]+)/)
    if (urlMatch) {
      trackUrl = decodeURIComponent(urlMatch[1])
    }

    // If we got an api.soundcloud.com URL, we need to resolve it to get artwork
    // The API URL looks like: https://api.soundcloud.com/tracks/123456
    if (trackUrl.includes('api.soundcloud.com/tracks/')) {
      const trackIdMatch = trackUrl.match(/tracks\/(\d+)/)
      if (trackIdMatch) {
        try {
          // Try to resolve the track via SoundCloud's resolve endpoint
          // First fetch the track page to get the actual URL
          const resolveUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`
          const response = await axios.get(resolveUrl, { timeout: 5000 })
          if (response.data?.thumbnail_url) {
            // SoundCloud returns small thumbnails, try to get larger one
            return response.data.thumbnail_url.replace('-large', '-t500x500').replace('-t200x200', '-t500x500')
          }
        } catch {
          // API URLs don't always work with oEmbed, return null
          return null
        }
      }
    }

    // Regular SoundCloud URL (soundcloud.com/artist/track)
    if (trackUrl.includes('soundcloud.com') && !trackUrl.includes('w.soundcloud.com') && !trackUrl.includes('api.soundcloud.com')) {
      try {
        const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`, { timeout: 5000 })
        if (response.data?.thumbnail_url) {
          // Get larger thumbnail
          return response.data.thumbnail_url.replace('-large', '-t500x500').replace('-t200x200', '-t500x500')
        }
      } catch {
        return null
      }
    }
  }

  // Bandcamp - extract album art from embed or page URL
  if (mediaLink.includes('bandcamp.com')) {
    // Embed format: bandcamp.com/EmbeddedPlayer/album=xxx
    const albumMatch = mediaLink.match(/album=(\d+)/)
    if (albumMatch) {
      // Bandcamp album art URL pattern
      return `https://f4.bcbits.com/img/a${albumMatch[1]}_10.jpg`
    }
    // Track format: bandcamp.com/EmbeddedPlayer/track=xxx
    const trackMatch = mediaLink.match(/track=(\d+)/)
    if (trackMatch) {
      return `https://f4.bcbits.com/img/a${trackMatch[1]}_10.jpg`
    }
  }

  // Vimeo - handles embed and regular URLs
  if (mediaLink.includes('vimeo.com')) {
    const match = mediaLink.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (match) {
      const response = await axios.get(`https://vimeo.com/api/v2/video/${match[1]}.json`, { timeout: 5000 })
      return response.data?.[0]?.thumbnail_large || null
    }
  }

  // Instagram - extract from embed URL or use oEmbed
  if (mediaLink.includes('instagram.com')) {
    const match = mediaLink.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    if (match) {
      // Instagram oEmbed endpoint
      try {
        const response = await axios.get(`https://graph.facebook.com/v18.0/instagram_oembed?url=https://www.instagram.com/p/${match[1]}/&access_token=public`, { timeout: 5000 })
        return response.data?.thumbnail_url || null
      } catch {
        // Instagram oEmbed requires app token, fallback to null
        return null
      }
    }
  }

  // TikTok - try oEmbed
  if (mediaLink.includes('tiktok.com')) {
    const match = mediaLink.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
    if (match) {
      try {
        const response = await axios.get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(mediaLink)}`, { timeout: 5000 })
        return response.data?.thumbnail_url || null
      } catch {
        return null
      }
    }
  }

  return null
}
