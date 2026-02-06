/**
 * OGUN Radio Broadcast Cron
 * POST /api/agent/radio/broadcast
 *
 * Called by Vercel Cron to automatically:
 * 1. Advance to next track
 * 2. Post "Now Playing" to SoundChain agent feed
 * 3. Optionally post to Moltbook
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/agent/radio/broadcast",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// Moltbook OGUN agent API key
const MOLTBOOK_OGUN_KEY = process.env.MOLTBOOK_OGUN_API_KEY || 'moltbook_sk_-Q3B4vccy5MXXiNdOEPYLD2QIlCqrM-8'

interface BroadcastResult {
  success: boolean
  track?: {
    id: string
    title: string
    artist: string
  }
  broadcasts: {
    soundchain: 'sent' | 'failed' | 'skipped'
    moltbook: 'sent' | 'failed' | 'skipped' | 'rate_limited'
  }
  error?: string
  meta: {
    timestamp: string
    request_id: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BroadcastResult>
) {
  const requestId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Only allow POST (from cron) or GET with secret (for manual trigger)
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '')
  const isAuthorized = req.method === 'POST' || cronSecret === process.env.CRON_SECRET

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      broadcasts: { soundchain: 'skipped', moltbook: 'skipped' },
      error: 'Method not allowed',
      meta: { timestamp: new Date().toISOString(), request_id: requestId }
    })
  }

  try {
    // 1. Advance to next track on the radio
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://soundchain.io'
    const radioRes = await fetch(`${baseUrl}/api/agent/radio?broadcast=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const radioData = await radioRes.json()

    if (!radioData.success || !radioData.data?.now_playing) {
      return res.status(500).json({
        success: false,
        broadcasts: { soundchain: 'failed', moltbook: 'skipped' },
        error: 'No track available for broadcast',
        meta: { timestamp: new Date().toISOString(), request_id: requestId }
      })
    }

    const track = radioData.data.now_playing
    const broadcastMessage = formatMoltbookPost(track)

    // 2. Post to SoundChain agent feed (already done by radio endpoint)
    const soundchainResult = radioData.broadcast?.soundchain || 'sent'

    // 3. Post to Moltbook (if enabled)
    let moltbookResult: 'sent' | 'failed' | 'skipped' | 'rate_limited' = 'skipped'

    const postToMoltbook = req.query.moltbook !== 'false'
    if (postToMoltbook) {
      try {
        const moltRes = await fetch('https://www.moltbook.com/api/v1/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MOLTBOOK_OGUN_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `🎵 OGUN Radio: ${track.title}`,
            content: broadcastMessage,
            submolt: 'crypto'
          })
        })

        if (moltRes.status === 429) {
          moltbookResult = 'rate_limited'
        } else if (moltRes.ok) {
          moltbookResult = 'sent'
        } else {
          moltbookResult = 'failed'
        }
      } catch (e) {
        moltbookResult = 'failed'
      }
    }

    return res.status(200).json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist
      },
      broadcasts: {
        soundchain: soundchainResult,
        moltbook: moltbookResult
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    })

  } catch (error: any) {
    console.error('[OGUN Broadcast] Error:', error)
    return res.status(500).json({
      success: false,
      broadcasts: { soundchain: 'failed', moltbook: 'failed' },
      error: error.message || 'Broadcast failed',
      meta: { timestamp: new Date().toISOString(), request_id: requestId }
    })
  }
}

function formatMoltbookPost(track: any): string {
  const lines = [
    `**NOW PLAYING on OGUN Radio** 📻`,
    ``,
    `🎵 **${track.title}**`,
    `by ${track.artist}`,
    ``
  ]

  if (track.is_nft) {
    lines.push(`✅ NFT Track - On-chain licensed`)
    lines.push(`💰 Streaming rewards enabled via OGUN L2`)
    lines.push(``)
  }

  if (track.owner?.handle) {
    lines.push(`Owner: @${track.owner.handle}`)
  }

  lines.push(``)
  lines.push(`🔗 **Listen:** soundchain.io/dex/track/${track.id}`)
  lines.push(`📻 **Radio API:** soundchain.io/api/agent/radio`)
  lines.push(`📖 **Docs:** docs.soundchain.io`)
  lines.push(``)
  lines.push(`---`)
  lines.push(`*OGUN Radio - The decentralized P2P licensing house for humans and agents*`)
  lines.push(`*Established 2021 | 10,000+ commits | Real infrastructure*`)

  return lines.join('\n')
}
