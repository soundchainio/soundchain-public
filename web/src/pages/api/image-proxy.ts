import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Image proxy to bypass CORS for canvas operations.
 * Used by CreateStoryModal to draw artwork on canvas for radio story cards.
 * Only allows image content types from trusted domains.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Only allow trusted image sources
  const allowed = [
    'soundchain-api-production-uploads.s3',
    'gateway.pinata.cloud',
    'ipfs.io',
    'gateway.pinata.cloud',
    'nftstorage.link',
    'arweave.net',
    'cloudflare-ipfs.com',
  ]

  try {
    const parsed = new URL(url)
    if (!allowed.some(domain => parsed.hostname.includes(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Not an image' })
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch image' })
  }
}
