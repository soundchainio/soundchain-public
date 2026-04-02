/**
 * POST /api/push/trade-alert — Send Web Push for OGUN Trader bot events
 *
 * Sends push notification to the founder's devices when the bot
 * executes a trade. Phone lights up, vibrates, flashes.
 *
 * Body: { action, pair, price, qty, pnl, pnlPct }
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'

const webpush = (() => {
  try { return require('web-push') } catch { return null }
})()

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

// Founder's profile ID — hardcoded for speed (furda1 / furda_nfts)
const FOUNDER_HANDLES = ['furda1', 'furda_nfts', 'furdA1']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { action, pair, price, qty, pnl, pnlPct, reason } = req.body

  if (!webpush || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Web Push not configured' })
  }

  try {
    webpush.setVapidDetails('mailto:soundchain@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find founder's push subscriptions
    const founderUsers = await db.collection('users').find({
      handle: { $in: FOUNDER_HANDLES }
    }).toArray()

    // Collect all possible IDs (profileId, _id, userId) for subscription lookup
    const founderProfileIds = founderUsers.flatMap(u => [
      u.profileId,
      u.profileId?.toString(),
      u._id,
      u._id?.toString(),
    ]).filter(Boolean)

    const subscriptions = await db.collection('pushsubscriptions').find({
      $or: [
        { profileId: { $in: founderProfileIds } },
        { userId: { $in: founderProfileIds } },
      ]
    }).toArray()

    if (subscriptions.length === 0) {
      return res.status(200).json({ sent: 0, reason: 'No push subscriptions found' })
    }

    // Build notification
    const emoji = action === 'BUY' ? '🟢' : action === 'SELL' ? '💰' : '⛔'
    const pnlStr = pnl ? ` | ${pnl >= 0 ? '+' : ''}$${parseFloat(pnl).toFixed(2)}` : ''
    const title = `${emoji} OGUN TRADER: ${action} ${pair}`
    const body = `${parseFloat(qty).toFixed(2)} SOL @ $${parseFloat(price).toFixed(2)}${pnlStr}${reason ? '\n' + reason : ''}`

    const payload = JSON.stringify({
      title,
      body,
      icon: '/favicons/android-chrome-192x192.png',
      badge: '/favicons/favicon-32x32.png',
      tag: `trade-${Date.now()}`,
      requireInteraction: true,  // Stays on screen until dismissed
      vibrate: [200, 100, 200, 100, 300],  // Custom vibration pattern
      data: {
        url: '/dex/wallet',
        type: 'trade_alert',
      }
    })

    let sent = 0
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }, payload)
        sent++
      } catch (err: any) {
        // Remove expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.collection('pushsubscriptions').deleteOne({ _id: sub._id })
        }
      }
    }

    return res.status(200).json({ sent, total: subscriptions.length })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
