import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchChannelLatest, fetchMultiChannelLatest, getBoxingChannels, type YouTubeVideo } from '@/lib/youtube'
import type { SportKey } from '@/lib/espn'

type SportParam = SportKey | 'f1' | 'boxing' | 'wwe'

const VALID_SPORTS = new Set<SportParam>([
  'nba', 'nfl', 'mlb', 'nhl', 'wnba', 'mma', 'soccerEpl', 'soccerMls', 'ncaaFootball', 'ncaaMens', 'f1', 'boxing', 'wwe',
])

interface CacheEntry { videos: YouTubeVideo[]; fetchedAt: number; error?: string }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 10 * 60_000  // 10 min — channel RSS updates infrequently

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sport = String(req.query.sport ?? '') as SportParam
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 24)

  if (!VALID_SPORTS.has(sport)) {
    return res.status(400).json({ error: `Invalid sport. Use one of: ${[...VALID_SPORTS].join(', ')}` })
  }

  const cacheKey = `${sport}:${limit}`
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && now - cached.fetchedAt < TTL_MS) {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')
    return res.json({ videos: cached.videos, fetchedAt: cached.fetchedAt, cached: true })
  }

  try {
    const videos = sport === 'boxing'
      ? await fetchMultiChannelLatest(getBoxingChannels(), limit)
      : await fetchChannelLatest(sport as SportKey | 'f1' | 'wwe', limit)
    cache.set(cacheKey, { videos, fetchedAt: now })
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')
    return res.json({ videos, fetchedAt: now, cached: false })
  } catch (err: any) {
    if (cached) {
      return res.json({ videos: cached.videos, fetchedAt: cached.fetchedAt, cached: true, stale: true })
    }
    return res.status(502).json({ error: err?.message ?? 'YouTube RSS unavailable', videos: [] })
  }
}
