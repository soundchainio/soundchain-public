import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { sendPrivateDM } from 'lib/nostr/privateDM'
// @noble/hashes@2.x: only `./utils.js` is exported. See privateDM.ts comment.
import { hexToBytes } from '@noble/hashes/utils.js'
// @ts-ignore — web-push has no bundled types and we don't need them at this surface
import webPush from 'web-push'

// POST { toProfileId?: string, toPhoneHash?: string, body: string }
//
// Native text-style DM. Drops a row in the in-app messages collection AND
// fan-outs to (a) Web Push if the recipient has subscribed, and (b) Nostr
// NIP-17 if either party has a nostrPubkey on file. Whatever channels are
// wired light up; nothing required for delivery.
//
// Recipient resolution: caller supplies EITHER toProfileId (direct profile)
// OR toPhoneHash (we look up which user that hash belongs to). Phone-hash
// path enables address-book-based "send by phone number" UX while never
// exposing plaintext numbers server-side (Signal pattern).

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@soundchain.io'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

  const { toProfileId, toPhoneHash, body } = req.body || {}
  const text = typeof body === 'string' ? body.trim() : ''
  if (!text) return res.status(400).json({ error: 'body required' })
  if (text.length > 4000) return res.status(400).json({ error: 'body too long (max 4000 chars)' })
  if (!toProfileId && !toPhoneHash) {
    return res.status(400).json({ error: 'toProfileId or toPhoneHash required' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')
    const users = db.collection('users')
    const profiles = db.collection('profiles')

    // Resolve recipient.
    let recipientUser: any = null
    if (toProfileId) {
      const profile = await profiles.findOne({ _id: new ObjectId(String(toProfileId)) })
      if (!profile) return res.status(404).json({ error: 'Recipient profile not found' })
      recipientUser = await users.findOne({ profileId: profile._id })
    } else if (toPhoneHash) {
      if (!/^[a-f0-9]{64}$/i.test(String(toPhoneHash))) {
        return res.status(400).json({ error: 'Invalid phone hash' })
      }
      recipientUser = await users.findOne({ phoneHash: String(toPhoneHash).toLowerCase() })
      if (!recipientUser) {
        return res.status(404).json({ error: 'No SoundChain user registered to that number' })
      }
    }
    if (!recipientUser) return res.status(404).json({ error: 'Recipient not found' })

    const recipientProfileId = recipientUser.profileId as ObjectId
    if (!recipientProfileId) return res.status(404).json({ error: 'Recipient profile missing' })

    // Block self-DM.
    if (String(recipientProfileId) === String(auth.profileId)) {
      return res.status(400).json({ error: 'Cannot text yourself' })
    }

    // Hydrate sender display data for the push body.
    const senderProfile = await profiles.findOne(
      { _id: auth.profileId },
      { projection: { displayName: 1, userHandle: 1, profilePicture: 1 } }
    )
    const senderName = senderProfile?.displayName || senderProfile?.userHandle || 'Someone'

    // 1) Persist as in-app DM so it shows up in Pulse / messages tab.
    const now = new Date()
    const messageDoc = {
      fromId: auth.profileId,
      toId: recipientProfileId,
      message: text,
      kind: 'text-dm',
      read: false,
      createdAt: now,
      updatedAt: now,
    }
    const { insertedId } = await db.collection('messages').insertOne(messageDoc)
    await profiles.updateOne(
      { _id: recipientProfileId },
      { $inc: { unreadMessageCount: 1 } }
    )

    // 2) Fan-out: web push + Nostr in parallel, never block the response on
    //    a failed channel — return 200 the moment the message is persisted.
    const fanOut = (async () => {
      const channels: string[] = []

      // Web Push to all the recipient's subscribed devices.
      if (VAPID_PUBLIC && VAPID_PRIVATE) {
        try {
          const subs = await db.collection('pushsubscriptions').find({
            profileId: String(recipientProfileId),
          }).toArray()
          if (subs.length > 0) {
            const payload = JSON.stringify({
              title: senderName,
              body: text.length > 140 ? `${text.slice(0, 137)}…` : text,
              icon: senderProfile?.profilePicture || '/favicons/android-chrome-192x192.png',
              badge: '/favicons/favicon-32x32.png',
              tag: `dm-${auth.profileId}`,
              data: { url: `/dex/pulse?with=${recipientProfileId}` },
              requireInteraction: false,
            })
            await Promise.allSettled(subs.map((sub: any) =>
              webPush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
              ).catch((e: any) => {
                if (e?.statusCode === 410 || e?.statusCode === 404) {
                  return db.collection('pushsubscriptions').deleteOne({ endpoint: sub.endpoint })
                }
              })
            ))
            channels.push('webpush')
          }
        } catch (e) {
          console.error('[send-text] web push fan-out:', e)
        }
      }

      // Nostr NIP-17 — sender signs with their own keypair if available; else
      //   we silently skip (recipient still got the in-app + push channels).
      try {
        const senderUser = await users.findOne(
          { _id: new ObjectId(auth.userId) },
          { projection: { nostrPrivateKey: 1, nostrPubkey: 1 } }
        )
        const senderPriv = senderUser?.nostrPrivateKey
        const recipientNostr = recipientUser?.nostrPubkey
        if (senderPriv && recipientNostr) {
          const senderKey = hexToBytes(String(senderPriv).replace(/^0x/, ''))
          await sendPrivateDM({
            senderPrivateKey: senderKey,
            recipientPubkey: String(recipientNostr),
            message: `${senderName}: ${text}`,
          })
          channels.push('nostr')
        }
      } catch (e) {
        console.error('[send-text] nostr fan-out:', e)
      }

      return channels
    })()

    // Don't await — let push/Nostr finish in background. Vercel keeps the
    // function alive long enough for the Promise to resolve before suspend.
    fanOut.then(channels => {
      console.log(`[send-text] message ${insertedId} fanned out via:`, channels.join(', ') || 'in-app only')
    })

    return res.status(200).json({
      ok: true,
      message: {
        id: insertedId.toString(),
        fromId: String(auth.profileId),
        toId: String(recipientProfileId),
        body: text,
        createdAt: now,
      },
    })
  } catch (err: any) {
    console.error('[send-text]', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
