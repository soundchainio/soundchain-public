import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

/**
 * Server-side oEmbed proxy to avoid CORS issues
 * GET /api/oembed?url=<embed-url>
 * Returns: { thumbnail_url: string | null }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

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

async function fetchThumbnail(mediaLink: string): Promise<string | null> {
  // Spotify
  if (mediaLink.includes('spotify.com')) {
    const match = mediaLink.match(/spotify\.com\/embed\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    if (match) {
      const [, type, id] = match
      const originalUrl = `https://open.spotify.com/${type}/${id}`
      const response = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(originalUrl)}`, { timeout: 5000 })
      return response.data?.thumbnail_url || null
    }
  }

  // SoundCloud
  if (mediaLink.includes('soundcloud.com')) {
    const urlMatch = mediaLink.match(/url=([^&]+)/)
    if (urlMatch) {
      const trackUrl = decodeURIComponent(urlMatch[1])
      const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`, { timeout: 5000 })
      return response.data?.thumbnail_url || null
    }
  }

  // Bandcamp
  if (mediaLink.includes('bandcamp.com')) {
    const albumMatch = mediaLink.match(/album=(\d+)/)
    if (albumMatch) {
      return `https://f4.bcbits.com/img/a${albumMatch[1]}_10.jpg`
    }
  }

  // Vimeo
  if (mediaLink.includes('vimeo.com')) {
    const match = mediaLink.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (match) {
      const response = await axios.get(`https://vimeo.com/api/v2/video/${match[1]}.json`, { timeout: 5000 })
      return response.data?.[0]?.thumbnail_large || null
    }
  }

  // YouTube - direct URL (no API needed)
  if (mediaLink.includes('youtube.com') || mediaLink.includes('youtu.be')) {
    const match = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }
  }

  return null
}
