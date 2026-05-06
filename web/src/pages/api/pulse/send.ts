import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// Web Push for DM notifications (CarPlay, Apple Watch, lock screen)
const webpush = (() => {
  try { return require('web-push') } catch { return null }
})()
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

// Auth via canonical `authFromRequest` (same fix as chats.ts May 6 2026).

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await authFromRequest(req)
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { toId, message } = req.body

  if (!toId || typeof toId !== 'string') {
    return res.status(400).json({ error: 'toId is required' })
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const messages = db.collection('messages')

    const profileId = auth.profileId.toString()

    if (toId === profileId) {
      return res.status(400).json({ error: 'Cannot send a message to yourself' })
    }

    const now = new Date()

    const doc = {
      message: message.trim(),
      fromId: (() => { try { return new ObjectId(profileId) } catch { return profileId } })(),
      toId: (() => { try { return new (require('mongodb').ObjectId)(toId) } catch { return toId } })(),
      createdAt: now,
      updatedAt: now,
      readAt: null,
    }

    const result = await messages.insertOne(doc)

    // Send web push notification (Apple Watch, lock screen, CarPlay)
    if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        webpush.setVapidDetails('mailto:agents@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)

        // Get sender display name
        const senderProfile = await db.collection('profiles').findOne({
          _id: (() => { try { return new ObjectId(profileId) } catch { return profileId } })(),
        })
        const senderName = senderProfile?.displayName || senderProfile?.handle || 'Someone'

        // Find recipient's user doc, then their push subscriptions
        const recipientProfile = await db.collection('profiles').findOne({
          _id: (() => { try { return new ObjectId(toId) } catch { return toId } })(),
        })
        if (recipientProfile) {
          const recipientUser = await db.collection('users').findOne({
            $or: [
              { profileId: toId },
              { profileId: new ObjectId(toId) },
            ],
          })
          if (recipientUser) {
            const subs = await db.collection('pushsubscriptions').find({
              userId: { $in: [recipientUser._id.toString(), recipientUser._id] },
            }).toArray()

            const payload = JSON.stringify({
              title: senderName,
              body: doc.message.length > 80 ? doc.message.slice(0, 77) + '...' : doc.message,
              icon: '/favicons/android-chrome-192x192.png',
              badge: '/favicons/favicon-32x32.png',
              data: { type: 'dm', url: '/pulse' },
              tag: `dm-${result.insertedId}`,
            })

            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth } },
                  payload
                )
              } catch (err: any) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                  await db.collection('pushsubscriptions').deleteOne({ _id: sub._id })
                }
              }
            }
          }
        }
      } catch (pushErr) {
        console.error('[Pulse send] Push notification failed (non-blocking):', pushErr)
      }
    }

    return res.status(201).json({
      message: {
        id: result.insertedId.toString(),
        message: doc.message,
        fromId: doc.fromId,
        toId: doc.toId,
        createdAt: doc.createdAt.toISOString(),
        readAt: null,
      },
    })
  } catch (error: any) {
    console.error('Pulse send error:', error)
    return res.status(500).json({ error: error.message || 'Failed to send message' })
  }
}
