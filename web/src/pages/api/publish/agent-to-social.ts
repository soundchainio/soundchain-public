import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * POST /api/publish/agent-to-social — Bridge agent blog posts to social platforms.
 * Called by Vercel cron daily. Reads recent agent posts and formats for X/IG.
 *
 * Auth: Vercel cron sends Authorization header, or PUBLISH_SECRET for manual trigger.
 */

const PUBLISH_SECRET = process.env.PUBLISH_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://soundchain.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET (Vercel cron) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth: Vercel cron sets Authorization header automatically, or check PUBLISH_SECRET
  const authHeader = req.headers.authorization
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManual = PUBLISH_SECRET && authHeader === `Bearer ${PUBLISH_SECRET}`

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Fetch recent agent blog posts from our own API
    const blogResponse = await fetch(`${SITE_URL}/api/agent/blog?limit=5`)
    if (!blogResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch agent blog' })
    }

    const blogData = await blogResponse.json()
    const posts = blogData.posts || []

    if (posts.length === 0) {
      return res.status(200).json({ message: 'No new agent posts to publish', published: 0 })
    }

    // Pick the most recent post that hasn't been published
    const post = posts[0]
    const tweetText = formatForX(post)

    // Post to X if configured
    const results: Array<{ platform: string; success: boolean; error?: string }> = []

    if (process.env.X_API_KEY) {
      try {
        const xResponse = await fetch(`${SITE_URL}/api/publish/x`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PUBLISH_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: tweetText }),
        })
        const xData = await xResponse.json()
        results.push({
          platform: 'x',
          success: xResponse.ok,
          error: xResponse.ok ? undefined : xData.error,
        })
      } catch (err) {
        results.push({ platform: 'x', success: false, error: String(err) })
      }
    }

    // Post to Instagram if configured (needs image URL)
    if (process.env.INSTAGRAM_ACCESS_TOKEN && post.imageUrl) {
      try {
        const igResponse = await fetch(`${SITE_URL}/api/publish/instagram`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PUBLISH_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: post.imageUrl,
            caption: formatForInstagram(post),
          }),
        })
        const igData = await igResponse.json()
        results.push({
          platform: 'instagram',
          success: igResponse.ok,
          error: igResponse.ok ? undefined : igData.error,
        })
      } catch (err) {
        results.push({ platform: 'instagram', success: false, error: String(err) })
      }
    }

    return res.status(200).json({
      message: 'Agent-to-social bridge complete',
      published: results.filter(r => r.success).length,
      results,
    })
  } catch (err) {
    console.error('[agent-to-social] Error:', err)
    return res.status(500).json({ error: 'Bridge failed' })
  }
}

function formatForX(post: any): string {
  const title = post.title || ''
  const body = post.body || post.content || ''
  const agent = post.agentName || 'SoundChain'

  // X limit: 280 chars. Title + snippet + link + agent credit
  const link = 'https://soundchain.io/agent-feed'
  const credit = `\n\n— ${agent} on SoundChain`
  const maxBody = 280 - title.length - credit.length - link.length - 10 // padding

  const snippet = body.length > maxBody ? body.substring(0, maxBody - 3) + '...' : body
  return `${title}\n\n${snippet}${credit}\n${link}`
}

function formatForInstagram(post: any): string {
  const title = post.title || ''
  const body = post.body || post.content || ''
  const agent = post.agentName || 'SoundChain'
  const tags = '#SoundChain #Web3Music #NFT #OGUN #MusicNFT #Web3'

  return `${title}\n\n${body}\n\n— ${agent}\n\n${tags}`
}
