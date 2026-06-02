import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Twitter Syndication API proxy — fetches tweet data for native rendering.
 * Uses the public syndication endpoint (no API key needed).
 * GET /api/social/tweet?id=TWEET_ID
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid tweet ID' })
  }

  try {
    // Token generation matches Twitter's syndication widget pattern
    const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')

    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SoundChain/1.0)',
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Tweet not found' })
    }

    const data = await response.json()

    // Normalize the response
    const tweet = {
      id: data.id_str || id,
      text: data.text || '',
      author: {
        name: data.user?.name || '',
        handle: data.user?.screen_name || '',
        avatar: data.user?.profile_image_url_https?.replace('_normal', '_200x200') || '',
        verified: data.user?.is_blue_verified || data.user?.verified || false,
      },
      media: (data.mediaDetails || []).map((m: any) => ({
        type: m.type, // 'photo' | 'video' | 'animated_gif'
        thumbnailUrl: m.media_url_https || '',
        // Pick a LIGHT mp4 variant for instant inline autoplay-on-scroll (like
        // YouTube). The highest variant is often 1080p @ 10Mbit, which buffers too
        // long to autoplay in a feed → looks stuck on the poster. Take the highest
        // variant ≤ 2.5Mbit (~720p), falling back to the smallest if all are heavy.
        videoUrl: (() => {
          const mp4s = (m.video_info?.variants || [])
            .filter((v: any) => v.content_type === 'video/mp4' && v.url)
            .sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0)) // ascending
          if (!mp4s.length) return null
          const light = mp4s.filter((v: any) => (v.bitrate || 0) <= 2_500_000)
          return (light.length ? light[light.length - 1] : mp4s[0]).url
        })(),
        width: m.original_info?.width,
        height: m.original_info?.height,
      })),
      metrics: {
        replies: data.conversation_count || 0,
        retweets: data.retweet_count || 0,
        likes: data.favorite_count || 0,
      },
      createdAt: data.created_at || '',
    }

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(tweet)
  } catch (err) {
    console.error('[tweet API] Error fetching tweet:', err)
    return res.status(500).json({ error: 'Failed to fetch tweet' })
  }
}
