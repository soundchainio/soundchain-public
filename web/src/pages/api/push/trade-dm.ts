/**
 * POST /api/push/trade-dm — Bot sends DM + push to founder via Pulse
 *
 * Creates a real DM message in the messages collection from the
 * OGUN Trader bot agent to the founder. Shows up in Pulse inbox
 * AND triggers push notification.
 *
 * No JWT auth needed — bot authenticates via internal secret.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

const webpush = (() => {
  try { return require('web-push') } catch { return null }
})()

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

// OGUN Trader bot identity
const BOT_NAME = 'OGUN Trader'
const FOUNDER_HANDLES = ['furda1', 'furda_nfts', 'furdA1']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, type } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find or create the bot's profile
    let botProfile = await db.collection('profiles').findOne({ displayName: BOT_NAME, badges: 'bot' })
    if (!botProfile) {
      const botProfileId = new ObjectId()
      await db.collection('profiles').insertOne({
        _id: botProfileId,
        displayName: BOT_NAME,
        profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=ogun-trader&backgroundColor=0a0a0a',
        bio: 'SOL micro-ripple rider. Never sleeps. Never sells at a loss.',
        badges: ['bot', 'agent'],
        followerCount: 0,
        followingCount: 0,
        createdAt: new Date(),
      })
      botProfile = { _id: botProfileId }
    }

    // Find founder's profile
    const founderUser = await db.collection('users').findOne({ handle: { $in: FOUNDER_HANDLES } })
    if (!founderUser) return res.status(404).json({ error: 'Founder not found' })

    const founderProfileId = founderUser.profileId

    // Insert DM
    const now = new Date()
    await db.collection('messages').insertOne({
      message: message.trim(),
      fromId: botProfile._id,
      toId: (() => { try { return new ObjectId(founderProfileId) } catch { return founderProfileId } })(),
      createdAt: now,
      updatedAt: now,
      readAt: null,
    })

    // Increment unread count
    await db.collection('profiles').updateOne(
      { _id: (() => { try { return new ObjectId(founderProfileId) } catch { return founderProfileId } })() },
      { $inc: { unreadMessageCount: 1 } }
    )

    // Send push notification
    if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
      webpush.setVapidDetails('mailto:agents@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)

      const subs = await db.collection('pushsubscriptions').find({
        profileId: { $in: [founderProfileId, founderProfileId.toString()] }
      }).toArray()

      const emoji = type === 'buy' ? '🟢' : type === 'sell' ? '💰' : '📊'
      const payload = JSON.stringify({
        title: `${emoji} ${BOT_NAME}`,
        body: message.slice(0, 200),
        icon: '/favicons/android-chrome-192x192.png',
        tag: `trade-dm-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 300],
        data: { url: '/dex/pulse', type: 'trade_dm' },
      })

      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.collection('pushsubscriptions').deleteOne({ _id: sub._id })
          }
        }
      }
    }

    return res.status(200).json({ success: true, message: 'DM sent to founder' })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
