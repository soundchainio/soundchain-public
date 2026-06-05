import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'

// Optional web-push (Pulse) — same FREE VAPID stack the rest of the app uses.
// require()'d defensively so a missing dep never breaks inquiry delivery.
const webpush = (() => {
  try { return require('web-push') } catch { return null }
})()
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

// ─── MANAGER: real booking delivery ──────────────────────────────────────────
// The pro's manager agent collects an inquiry (booking / collab / business /
// hire) from a visitor — possibly a promoter in another country writing in
// their own language — and this route DELIVERS it to the pro. Persists to the
// `managerInquiries` collection (the pro's inbox source of truth) AND drops a
// row into the canonical `notifications` collection so the pro's bell lights up.
// Public (no auth): anyone can submit an inquiry to a pro, exactly like emailing
// their booking address. Validated + length-capped to keep it spam-resistant.

const TYPES = new Set(['booking', 'collab', 'business', 'hire'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Trim + hard-cap any free-text field so a single submit can't bloat a doc.
function clip(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const b = (req.body || {}) as Record<string, unknown>

  const recipientProfileId = clip(b.profileId, 64)
  const type = clip(b.type, 16)
  const name = clip(b.name, 120)
  const email = clip(b.email, 200)

  if (!recipientProfileId) return res.status(400).json({ error: 'profileId required' })
  if (!TYPES.has(type)) return res.status(400).json({ error: 'invalid inquiry type' })
  if (!name) return res.status(400).json({ error: 'name required' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'valid email required' })

  let recipientOid: ObjectId
  try { recipientOid = new ObjectId(recipientProfileId) } catch { return res.status(400).json({ error: 'bad profileId' }) }

  // Structured per-type fields (all optional, all clipped). Kept under `fields`
  // so the schema stays flexible across professions (a DJ's eventType/budget vs.
  // an attorney's company/inquiryType) without an ever-growing top-level shape.
  const f = (b.fields || {}) as Record<string, unknown>
  const fields = {
    eventType: clip(f.eventType, 80),
    date: clip(f.date, 40),
    location: clip(f.location, 160),
    budgetRange: clip(f.budgetRange, 60),
    itinerary: clip(f.itinerary, 2000),
    hotel: clip(f.hotel, 1000),
    artistProjectName: clip(f.artistProjectName, 120),
    collabType: clip(f.collabType, 80),
    workLink: clip(f.workLink, 400),
    company: clip(f.company, 160),
    inquiryType: clip(f.inquiryType, 80),
  }

  const message = clip(b.message, 4000)
  const visitorLang = clip(b.visitorLang, 16) // BCP-47 tag of the visitor's UI language (context for the pro)

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Confirm the recipient is a real profile (don't persist inquiries into the void).
    const profile = await db.collection('profiles').findOne(
      { _id: recipientOid },
      { projection: { _id: 1, displayName: 1, userHandle: 1 } },
    )
    if (!profile) return res.status(404).json({ error: 'pro not found' })

    const now = new Date()
    const inquiry = {
      recipientProfileId: recipientOid,
      type,
      name,
      email,
      fields,
      message,
      visitorLang,
      read: false,
      status: 'new' as const,
      createdAt: now,
    }
    const { insertedId } = await db.collection('managerInquiries').insertOne(inquiry)

    // Where the pro reads it: their own manager page hosts the inbox panel.
    const inboxLink = profile.userHandle ? `/manager/${profile.userHandle}` : '/manage-requests'

    // A vivid, on-the-go push body — exactly the "so-and-so wants to book you
    // for a gig in Japan" moment. Uses whatever structured context the visitor
    // supplied (location / project / company).
    const verb = type === 'booking' ? 'booking request'
      : type === 'collab' ? 'collaboration proposal'
      : type === 'hire' ? 'hire inquiry'
      : 'business inquiry'
    const pushBody = type === 'booking'
      ? `${name} wants to book you${fields.location ? ` for a gig in ${fields.location}` : ''}`
      : type === 'collab'
      ? `${name} wants to collaborate${fields.artistProjectName ? ` — ${fields.artistProjectName}` : ''}`
      : type === 'hire'
      ? `${name} wants to hire you${fields.location ? ` in ${fields.location}` : ''}`
      : `${name} sent a business inquiry${fields.company ? ` from ${fields.company}` : ''}`

    // Best-effort: light the pro's in-app bell AND fire a Pulse web-push so they
    // get it on the go. Wrapped so a notification hiccup never fails the inquiry
    // itself (delivery to the inbox is what matters).
    try {
      await db.collection('notifications').insertOne({
        type: 'managerinquiry',
        recipientProfileId: recipientOid, // list.ts filters on this
        toProfileId: recipientOid,        // clear.ts filters on this — set both
        body: pushBody,
        message: pushBody,
        link: inboxLink,
        metadata: { inquiryId: insertedId, inquiryType: type, fromName: name, fromEmail: email },
        read: false,
        createdAt: now,
      })
      await db.collection('profiles').updateOne(
        { _id: recipientOid },
        { $inc: { unreadNotificationCount: 1 } },
      )

      // Pulse — FREE web-push to every device the pro has subscribed.
      if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
        webpush.setVapidDetails('mailto:agents@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)
        const recipientUser = await db.collection('users').findOne(
          { $or: [{ profileId: recipientOid }, { profileId: recipientProfileId }] },
          { projection: { _id: 1 } },
        )
        if (recipientUser) {
          const subs = await db.collection('pushsubscriptions').find({
            userId: { $in: [recipientUser._id.toString(), recipientUser._id] },
          }).toArray()
          const payload = JSON.stringify({
            title: `📣 New ${verb} via Manager`,
            body: pushBody,
            icon: '/favicons/android-chrome-192x192.png',
            badge: '/favicons/favicon-32x32.png',
            tag: `manager-inquiry-${insertedId}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: { url: inboxLink, type: 'manager_inquiry' },
          })
          for (const sub of subs) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await db.collection('pushsubscriptions').deleteOne({ _id: sub._id })
              }
            }
          }
        }
      }
    } catch { /* notification + push are a bonus; inquiry already persisted */ }

    return res.status(200).json({ ok: true, id: insertedId })
  } catch (err: any) {
    console.error('[manager/inquiry] error:', err)
    return res.status(500).json({ error: 'failed to deliver inquiry' })
  }
}
