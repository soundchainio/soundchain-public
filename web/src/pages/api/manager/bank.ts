import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { encryptField, decryptField, maskValue, hashToken, isVaultConfigured } from 'lib/api/managerCrypto'

// ─── MANAGER bank vault + pay-to-reveal ───────────────────────────────────────
// A pro MAY store traditional bank/wire details for promoters who pay off-chain.
// They are encrypted at rest (AES-256-GCM, server-only key) and only decrypted:
//   - back to the OWNER, masked (•••• 4321), so they can see what's saved; or
//   - to a PROMOTER who has FUNDED an escrow (status 'funded') and holds the
//     matching one-time reveal token (pay-to-reveal). This is the fiat rail that
//     complements the on-chain crypto deposit.
//
//   POST                      (owner)  → upsert encrypted bank details.
//   GET                       (owner)  → masked view of what's stored.
//   GET ?reveal=1&escrowId&revealToken (public, gated) → decrypted details after pay.
//
// Bank numbers are NEVER returned to the browser unless the deposit is confirmed.

const BANK_FIELDS = ['accountName', 'bankName', 'accountNumber', 'routingNumber', 'swift', 'iban', 'notes'] as const

function clip(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const vault = db.collection('managerBankDetails')

  // ── Pay-to-reveal (public, gated on a funded escrow + one-time token) ──
  if (req.method === 'GET' && (req.query.reveal === '1' || req.query.revealToken)) {
    const escrowId = clip(req.query.escrowId, 64)
    const revealToken = clip(req.query.revealToken, 80)
    if (!escrowId || !revealToken) return res.status(400).json({ error: 'escrowId and revealToken required' })

    let eoid: ObjectId
    try { eoid = new ObjectId(escrowId) } catch { return res.status(400).json({ error: 'bad escrowId' }) }
    const escrow = await db.collection('managerEscrows').findOne({ _id: eoid })
    if (!escrow) return res.status(404).json({ error: 'escrow not found' })
    if (escrow.status !== 'funded') {
      // 402 Payment Required — the deposit must confirm before the reveal unlocks.
      return res.status(402).json({ error: 'Deposit not yet confirmed — pay-to-reveal is locked.' })
    }
    if (escrow.revealTokenHash !== hashToken(revealToken)) {
      return res.status(403).json({ error: 'Invalid reveal token.' })
    }

    const doc = await vault.findOne({ profileId: escrow.profileId })
    const bank: Record<string, string> = {}
    if (doc?.fields) {
      for (const f of BANK_FIELDS) {
        const dec = decryptField(doc.fields[f] || '')
        if (dec) bank[f] = dec
      }
    }
    await db.collection('managerEscrows').updateOne({ _id: eoid }, { $set: { revealedAt: new Date() } })
    return res.status(200).json({ revealed: true, bank, payoutAddress: escrow.destination })
  }

  // ── Owner: save encrypted bank details ──
  if (req.method === 'POST') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })
    if (!isVaultConfigured()) {
      return res.status(503).json({ error: 'Bank vault is not configured on the server yet.' })
    }

    const b = (req.body || {}) as Record<string, any>
    const fields: Record<string, string> = {}
    const masked: Record<string, string> = {}
    try {
      for (const f of BANK_FIELDS) {
        const raw = clip(b[f], 400)
        if (raw) {
          fields[f] = encryptField(raw)
          masked[f] = maskValue(raw)
        }
      }
      await vault.updateOne(
        { profileId: auth.profileId },
        { $set: { fields, profileId: auth.profileId, updatedAt: new Date() } },
        { upsert: true },
      )
      return res.status(200).json({ ok: true, masked })
    } catch (err: any) {
      console.error('[manager/bank] post error:', err)
      return res.status(500).json({ error: 'failed to save bank details' })
    }
  }

  // ── Owner: masked view of what's saved ──
  if (req.method === 'GET') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })
    const doc = await vault.findOne({ profileId: auth.profileId })
    const masked: Record<string, string> = {}
    if (doc?.fields) {
      for (const f of BANK_FIELDS) {
        const dec = decryptField(doc.fields[f] || '')
        if (dec) masked[f] = maskValue(dec)
      }
    }
    return res.status(200).json({ masked, configured: isVaultConfigured() })
  }

  return res.status(405).json({ error: 'GET or POST only' })
}
