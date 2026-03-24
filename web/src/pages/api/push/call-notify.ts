/**
 * POST /api/push/call-notify — Send Web Push for incoming call when user is offline
 *
 * Called by the tunnel relay when a call signal arrives and the target user
 * is not connected via WebSocket. Sends a push notification so the user
 * can tap to open Pulse and answer the call.
 *
 * Auth: X-Relay-Secret header must match TUNNEL_HOST_SECRET
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

// Web Push
const webpush = (() => {
  try { return require('web-push') } catch { return null }
})()

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const RELAY_SECRET = process.env.TUNNEL_HOST_SECRET || ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // Auth — only the relay can call this
  const secret = req.headers['x-relay-secret']
  if (!RELAY_SECRET || secret !== RELAY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { targetProfileId, callerName, callMode, callId } = req.body
  if (!targetProfileId) return res.status(400).json({ error: 'targetProfileId required' })

  if (!webpush || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Web Push not configured' })
  }

  try {
    webpush.setVapidDetails('mailto:agents@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)

    const client = await clientPromise
    const db = client.db('soundchain')

    // Find the user by profile ID, then get their push subscriptions
    const profile = await db.collection('profiles').findOne({ _id: new ObjectId(targetProfileId) })
    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    // Find the user document that owns this profile
    const user = await db.collection('users').findOne({
      $or: [
        { profileId: targetProfileId },
        { profileId: new ObjectId(targetProfileId) },
      ],
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Get push subscriptions for this user
    const subscriptions = await db.collection('pushsubscriptions').find({
      userId: { $in: [user._id.toString(), user._id] },
    }).toArray()

    if (subscriptions.length === 0) {
      return res.status(200).json({ sent: 0, reason: 'No push subscriptions' })
    }

    const payload = JSON.stringify({
      title: `Incoming ${callMode || 'voice'} call`,
      body: `${callerName || 'Someone'} is calling you on Pulse`,
      icon: '/favicons/android-chrome-192x192.png',
      badge: '/favicons/favicon-32x32.png',
      data: {
        type: 'incoming_call',
        url: '/dex/pulse',
        callId,
        callerName,
      },
      tag: `call-${callId}`,
      requireInteraction: true, // Keep notification visible until user acts
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
          },
          payload
        )
        sent++
      } catch (err: any) {
        failed++
        // Remove expired/invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.collection('pushsubscriptions').deleteOne({ _id: sub._id })
        }
      }
    }

    return res.status(200).json({ sent, failed, total: subscriptions.length })
  } catch (err: any) {
    console.error('[Push Call Notify]', err)
    return res.status(500).json({ error: err.message })
  }
}
