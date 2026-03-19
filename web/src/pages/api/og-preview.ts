/**
 * Open Graph Preview API — Fetches og:title, og:description, og:image from any URL
 * Used by LinkPreviewCard to render rich previews in the feed.
 *
 * GET /api/og-preview?url=https://example.com
 */

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { url } = req.query
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' })

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SoundChainBot/1.0; +https://soundchain.io)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!response.ok) return res.status(502).json({ error: `HTTP ${response.status}` })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return res.status(200).json({ url, domain: parsed.hostname, title: parsed.hostname })
    }

    // Only read first 50KB to find OG tags (don't download entire page)
    const reader = response.body?.getReader()
    if (!reader) return res.status(502).json({ error: 'No body' })

    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Stop once we find </head> — OG tags are always in <head>
      if (html.includes('</head>')) break
    }
    reader.cancel()

    // Extract OG tags
    const getTag = (property: string): string | null => {
      // og:X, twitter:X
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
      ]
      for (const p of patterns) {
        const match = html.match(p)
        if (match?.[1]) return match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      }
      return null
    }

    const title = getTag('og:title') || getTag('twitter:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || parsed.hostname
    const description = getTag('og:description') || getTag('twitter:description') || getTag('description') || null
    const image = getTag('og:image') || getTag('twitter:image') || null
    const siteName = getTag('og:site_name') || null

    // Resolve relative image URLs
    let resolvedImage = image
    if (image && !image.startsWith('http')) {
      resolvedImage = new URL(image, url).toString()
    }

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

    return res.status(200).json({
      url,
      domain: parsed.hostname,
      title: title?.trim() || parsed.hostname,
      description: description?.trim() || null,
      image: resolvedImage || null,
      siteName: siteName?.trim() || null,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout fetching URL' })
    }
    return res.status(502).json({ error: err.message || 'Failed to fetch' })
  }
}
