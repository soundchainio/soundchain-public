import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'

// ─── MANAGER settings (server-side) ───────────────────────────────────────────
// GET  ?profileId=<id>  (public)  — the booker-facing config the agent quotes:
//                                    profession, services/rates, rider, payment
//                                    terms, payout. So a visitor in any country
//                                    (and the agent on the pro's behalf) sees it.
// POST                  (owner)   — upsert the caller's OWN config.
// Everything stored here is meant to be communicated to bookers — there are NO
// raw bank/account numbers (those land in a later encrypted + pay-to-reveal
// phase, never in this plain collection).

function clip(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const configs = db.collection('managerConfigs')

  if (req.method === 'GET') {
    const profileId = clip(req.query.profileId, 64)
    if (!profileId) return res.status(400).json({ error: 'profileId required' })
    let oid: ObjectId
    try { oid = new ObjectId(profileId) } catch { return res.status(400).json({ error: 'bad profileId' }) }
    try {
      const doc = await configs.findOne({ profileId: oid })
      if (!doc) return res.status(200).json({ config: null })
      const { _id, profileId: _p, updatedAt, ...config } = doc as any
      return res.status(200).json({ config })
    } catch (err: any) {
      console.error('[manager/config] get error:', err)
      return res.status(500).json({ error: 'failed to load config' })
    }
  }

  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })

    const b = (req.body || {}) as Record<string, any>
    try {
      // Sanitize + clip every field. A caller can only ever write their OWN
      // config (keyed on auth.profileId) — never another pro's.
      const services = Array.isArray(b.services)
        ? b.services.slice(0, 30).map((s: any) => ({
            name: clip(s?.name, 80),
            rate: clip(s?.rate, 60),
            note: clip(s?.note, 200),
          })).filter((s: any) => s.name || s.rate || s.note)
        : []

      const rider = {
        travel: clip(b.rider?.travel, 2000),
        accommodation: clip(b.rider?.accommodation, 2000),
        hospitality: clip(b.rider?.hospitality, 2000),
        technical: clip(b.rider?.technical, 2000),
      }

      const paymentTerms = {
        depositSchedule: clip(b.paymentTerms?.depositSchedule, 500),
        methods: clip(b.paymentTerms?.methods, 300),
        currency: clip(b.paymentTerms?.currency, 40),
        cancellation: clip(b.paymentTerms?.cancellation, 500),
      }

      const sv = b.sectionsVisible || {}
      const sectionsVisible = {
        greeting: sv.greeting !== false,
        tracks: sv.tracks !== false,
        booking: sv.booking !== false,
        collab: sv.collab !== false,
        business: sv.business !== false,
        socials: sv.socials !== false,
      }

      const config = {
        profession: clip(b.profession, 60),
        customGreetingText: clip(b.customGreetingText, 4000),
        customGreetingAudioUrl: clip(b.customGreetingAudioUrl, 600),
        selectedVoice: clip(b.selectedVoice, 80),
        bookingRate: clip(b.bookingRate, 120),
        availability: clip(b.availability, 200),
        tagline: clip(b.tagline, 160),
        services,
        rider,
        paymentTerms,
        payoutAddress: clip(b.payoutAddress, 120), // crypto wallet — public by design
        sectionsVisible,
        updatedAt: new Date(),
      }

      await configs.updateOne(
        { profileId: auth.profileId },
        { $set: { ...config, profileId: auth.profileId } },
        { upsert: true },
      )
      return res.status(200).json({ ok: true })
    } catch (err: any) {
      console.error('[manager/config] post error:', err)
      return res.status(500).json({ error: 'failed to save config' })
    }
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
