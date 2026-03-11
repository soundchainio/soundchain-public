import type { NextApiRequest, NextApiResponse } from 'next'

const ALLOWED_SHORT_DOMAINS = ['on.soundcloud.com', 'spotify.link']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const parsed = new URL(url)
    if (!ALLOWED_SHORT_DOMAINS.includes(parsed.hostname)) {
      return res.status(400).json({ error: 'Domain not allowed' })
    }

    const response = await fetch(url, { redirect: 'manual' })
    const location = response.headers.get('location')

    if (location) {
      return res.status(200).json({ resolved: location })
    }

    return res.status(200).json({ resolved: url })
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }
}
