/**
 * POST /api/broadcasts/send
 *
 * Admin-only. Fans out a broadcast message to a target audience via three
 * parallel channels per recipient:
 *   1. Pulse inbox — inserts a `messages` doc (sender = system @soundchain
 *      account, looks like a regular DM in the user's Pulse list)
 *   2. Web Push — posts to the user's `pushsubscriptions` rows if subscribed
 *   3. Nostr NIP-17 DM — sends gift-wrapped encrypted DM to user's nostrPubkey
 *      if they've enabled `notifyViaNostr` and have a pubkey
 *
 * Body:
 *   {
 *     audience: 'all' | 'returning_l1' | 'new_signups' | 'self',
 *     pushTitle: string,            // notification title (lock screen)
 *     pushBody: string,             // notification body preview (≤120 chars)
 *     body: string,                 // full message body (Pulse + Nostr DM)
 *     mediaUrls?: string[],         // optional attachments
 *     dryRun?: boolean,             // count + sample only, don't fan out
 *     batchSize?: number,           // default 50 — how many recipients per batch
 *     batchDelayMs?: number,        // default 200 — pause between batches
 *   }
 *
 * Returns: { audience, totalRecipients, sent: { inApp, push, nostr },
 *   failed: { inApp, push, nostr }, dryRunSamples?: [] }
 *
 * Safety: hard rate limit per batch + global ceiling on total recipients to
 * prevent a single button-tap from blasting 50k messages without dry-run first.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { AUDIENCE, MAINNET_CUTOVER_ISO, type Audience } from 'lib/broadcasts/welcomeManual'
import { sendPrivateDM } from 'lib/nostr/privateDM'
// @ts-ignore — web-push has no bundled types
import webPush from 'web-push'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:frank@soundchain.io'
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

const HARD_CEILING = 50_000 // never blast more than this in one call w/o dryRun

async function isAdmin(db: any, userId: string): Promise<{ ok: boolean; user?: any }> {
  const adminEmail = (process.env.ADMIN_EMAIL || 'frank@soundchain.io').toLowerCase()
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, profileId: 1 } },
  )
  if (!user?.email || user.email.toLowerCase() !== adminEmail) return { ok: false }
  return { ok: true, user }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const auth = await authFromRequest(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const client = await clientPromise
  const db = client.db('soundchain')

  const adminCheck = await isAdmin(db, auth.userId)
  if (!adminCheck.ok) return res.status(403).json({ error: 'Admin only' })

  const {
    audience = 'all',
    pushTitle = '',
    pushBody = '',
    body = '',
    mediaUrls = [],
    dryRun = false,
    batchSize = 50,
    batchDelayMs = 200,
  } = (req.body || {}) as {
    audience?: Audience
    pushTitle?: string
    pushBody?: string
    body?: string
    mediaUrls?: string[]
    dryRun?: boolean
    batchSize?: number
    batchDelayMs?: number
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' })
  }
  if (body.length > 8000) {
    return res.status(400).json({ error: 'body too long (max 8000 chars)' })
  }

  // Build the recipient query based on audience filter
  const profiles = db.collection('profiles')
  const cutover = new Date(MAINNET_CUTOVER_ISO)

  let recipientFilter: any = {}
  switch (audience) {
    case AUDIENCE.SELF:
      // Just the admin's own profile — for "send test to me"
      if (adminCheck.user?.profileId) {
        recipientFilter = { _id: adminCheck.user.profileId }
      } else {
        return res.status(400).json({ error: 'Admin has no profileId on user row' })
      }
      break
    case AUDIENCE.RETURNING_L1:
      recipientFilter = { createdAt: { $lt: cutover } }
      break
    case AUDIENCE.NEW_SIGNUPS:
      recipientFilter = { createdAt: { $gte: cutover } }
      break
    case AUDIENCE.ALL:
    default:
      recipientFilter = {}
      break
  }

  // Cursor through recipients — projection limits payload size
  const recipients = await profiles
    .find(recipientFilter, {
      projection: { _id: 1, userHandle: 1, displayName: 1, userId: 1, nostrPubkey: 1, notifyViaNostr: 1, createdAt: 1 },
    })
    .toArray()

  if (recipients.length > HARD_CEILING && !dryRun) {
    return res.status(400).json({
      error: `Audience too large for live send (${recipients.length} > ${HARD_CEILING}). Run with dryRun=true first to confirm.`,
      totalRecipients: recipients.length,
    })
  }

  // Dry-run: return sample of who'd receive it, don't fan out
  if (dryRun) {
    return res.status(200).json({
      audience,
      totalRecipients: recipients.length,
      dryRun: true,
      dryRunSamples: recipients.slice(0, 10).map((r) => ({
        profileId: r._id.toString(),
        handle: r.userHandle || null,
        displayName: r.displayName || null,
        createdAt: r.createdAt,
        hasNostrPubkey: !!r.nostrPubkey,
        notifyViaNostr: !!r.notifyViaNostr,
      })),
      sent: { inApp: 0, push: 0, nostr: 0 },
      failed: { inApp: 0, push: 0, nostr: 0 },
    })
  }

  // SoundChain system sender — inserts the message as if @soundchain DM'd them
  // The sender ID convention: profileId of the @soundchain admin account.
  // (Same flow as a normal DM, just the system account is on the From side.)
  const fromProfileId = adminCheck.user.profileId
  const fromUserId = new ObjectId(auth.userId)
  const messages = db.collection('messages')
  const pushSubs = db.collection('pushsubscriptions')

  // Stat counters
  const sent = { inApp: 0, push: 0, nostr: 0 }
  const failed = { inApp: 0, push: 0, nostr: 0 }
  const now = new Date()

  // Process in batches to avoid hammering Mongo + WebPush + Nostr relays
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (recipient) => {
        const recipientProfileId = recipient._id
        const recipientUserId = recipient.userId

        // 1. Pulse inbox — insert messages doc
        try {
          await messages.insertOne({
            fromId: fromProfileId,
            toId: recipientProfileId,
            message: body,
            mediaUrls,
            broadcast: true, // mark so the inbox UI can render w/ a [BROADCAST] badge
            createdAt: now,
            readAt: null,
          })
          sent.inApp += 1
        } catch (err) {
          failed.inApp += 1
        }

        // 2. Web Push — post to all of recipient's push subscriptions
        if (recipientUserId && VAPID_PUBLIC && VAPID_PRIVATE) {
          try {
            const subs = await pushSubs.find({ userId: recipientUserId.toString() }).toArray()
            for (const sub of subs) {
              if (!sub.endpoint || !sub.keys) continue
              try {
                await webPush.sendNotification(
                  { endpoint: sub.endpoint, keys: sub.keys },
                  JSON.stringify({
                    title: pushTitle || 'SoundChain',
                    body: pushBody || body.slice(0, 120),
                    icon: '/favicons/favicon-192x192.png',
                    badge: '/favicons/favicon-32x32.png',
                    url: 'https://soundchain.io/pulse',
                    tag: 'broadcast',
                  }),
                )
                sent.push += 1
              } catch (pushErr: any) {
                failed.push += 1
                // Stale subscription — clean it up
                if (pushErr?.statusCode === 404 || pushErr?.statusCode === 410) {
                  await pushSubs.deleteOne({ endpoint: sub.endpoint })
                }
              }
            }
          } catch {
            failed.push += 1
          }
        }

        // 3. Nostr NIP-17 — gift-wrapped encrypted DM
        if (recipient.notifyViaNostr && recipient.nostrPubkey) {
          try {
            await sendPrivateDM(recipient.nostrPubkey, body)
            sent.nostr += 1
          } catch {
            failed.nostr += 1
          }
        }
      }),
    )

    // Pause between batches to give Mongo + relays breathing room
    if (i + batchSize < recipients.length && batchDelayMs > 0) {
      await sleep(batchDelayMs)
    }
  }

  // Log the broadcast for audit + so we can re-run / cancel
  await db.collection('broadcasts').insertOne({
    sentBy: fromUserId,
    sentAt: now,
    audience,
    pushTitle,
    pushBody,
    body,
    mediaUrls,
    totalRecipients: recipients.length,
    sent,
    failed,
  })

  return res.status(200).json({
    audience,
    totalRecipients: recipients.length,
    sent,
    failed,
    sentAt: now.toISOString(),
  })
}
