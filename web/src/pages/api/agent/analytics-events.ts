/**
 * /api/agent/analytics-events
 *
 * POST — Record a user engagement event
 * GET — Summary of engagement metrics for War Room / agent_analytics
 *
 * Tracks every critical user action Jensen will ask about:
 * - Time to first stream (activation)
 * - Time to first post (engagement)
 * - Pill clicks (navigation patterns)
 * - Claims, uploads, mints (conversion)
 * - Feed interactions (retention)
 *
 * Lightweight — one POST per action, no blocking, fire-and-forget.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const COLLECTION = 'analytics_events'

// Valid event types — every major action is tracked
const VALID_EVENTS = [
  'page_view',        // Which page was loaded
  'first_stream',     // User played their first track
  'stream',           // Any track play
  'first_post',       // User created their first post
  'post_create',      // Any post creation
  'post_like',        // Liked a post
  'post_comment',     // Commented on a post
  'post_repost',      // Reposted
  'feed_scroll',      // Scrolled past 10 posts
  'pill_click',       // Navigation pill tap (which pill)
  'wall_visit',       // Visited someone's wall
  'profile_visit',    // Visited someone's profile
  'claim_ogun',       // Claimed OGUN rewards
  'upload_scid',      // Uploaded a SCid track
  'mint_nft',         // Minted an NFT
  'create_playlist',  // Created a playlist
  'create_reel',      // Created a story/reel
  'follow_user',      // Followed someone
  'send_dm',          // Sent a Pulse DM
  'open_radio',       // Opened OGUN Radio
  'open_neural',      // Opened Neural brain scanner
  'open_operator',    // Opened Operator file transfer
  'open_furl',        // Opened FURL terminal
  'open_warroom',     // Opened War Room
  'wallet_connect',   // Connected an external wallet
  'agent_interact',   // Interacted with a managed agent
  'node_ping',        // Pinged P2P network nodes
  'operator_upload',  // Uploaded file via Operator → IPFS
  'operator_transfer',// Started an Operator transfer
  'nodes_page_view',  // Visited the Nodes dashboard
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const col = db.collection(COLLECTION)

    if (req.method === 'POST') {
      const { event, meta, userId, sessionId } = req.body

      if (!event || !VALID_EVENTS.includes(event)) {
        return res.status(400).json({ error: `Invalid event. Valid: ${VALID_EVENTS.join(', ')}` })
      }

      await col.insertOne({
        event,
        meta: meta || {},          // Extra data (pill name, track id, etc.)
        userId: userId || null,     // Optional — anonymous tracking OK
        sessionId: sessionId || null,
        userAgent: req.headers['user-agent'] || null,
        createdAt: new Date(),
      })

      return res.status(201).json({ ok: true })
    }

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

      const now = new Date()
      const day = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [total, last24h, last7d, topEvents, topPills, hourlyActivity] = await Promise.all([
        col.estimatedDocumentCount(),
        col.countDocuments({ createdAt: { $gte: day } }),
        col.countDocuments({ createdAt: { $gte: week } }),
        // Top events by count
        col.aggregate([
          { $match: { createdAt: { $gte: week } } },
          { $group: { _id: '$event', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
        ]).toArray(),
        // Top pill clicks
        col.aggregate([
          { $match: { createdAt: { $gte: week }, event: 'pill_click' } },
          { $group: { _id: '$meta.pill', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]).toArray(),
        // Activity by hour (last 24h)
        col.aggregate([
          { $match: { createdAt: { $gte: day } } },
          { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray(),
      ])

      // Conversion funnel
      const [streams, posts, claims, uploads, mints] = await Promise.all([
        col.countDocuments({ event: 'first_stream', createdAt: { $gte: week } }),
        col.countDocuments({ event: 'first_post', createdAt: { $gte: week } }),
        col.countDocuments({ event: 'claim_ogun', createdAt: { $gte: week } }),
        col.countDocuments({ event: 'upload_scid', createdAt: { $gte: week } }),
        col.countDocuments({ event: 'mint_nft', createdAt: { $gte: week } }),
      ])

      return res.status(200).json({
        agent: 'agent_analytics',
        summary: {
          totalEvents: total,
          last24h,
          last7d,
          topEvents: topEvents.map((e: any) => ({ event: e._id, count: e.count })),
          topPills: topPills.map((p: any) => ({ pill: p._id, clicks: p.count })),
          hourlyActivity: hourlyActivity.map((h: any) => ({ hour: h._id, events: h.count })),
          conversionFunnel: {
            firstStreams: streams,
            firstPosts: posts,
            ogunClaims: claims,
            scidUploads: uploads,
            nftMints: mints,
          },
        },
        score: {
          // Engagement score — weighted metric for NVIDIA
          engagement: Math.min(100, Math.round(
            (streams * 10) + (posts * 15) + (claims * 20) + (uploads * 25) + (mints * 30)
          )),
          grade: streams + posts + claims > 50 ? 'A' : streams + posts + claims > 20 ? 'B' : streams + posts + claims > 5 ? 'C' : 'D',
        },
        generatedAt: new Date().toISOString(),
      })
    }

    return res.status(405).json({ error: 'GET or POST' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
