import type { NextApiRequest, NextApiResponse } from 'next'
import { ObjectId } from 'mongodb'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'
import { authFromRequest } from 'lib/api/authJwt'
import { SUPPORTED_TOKENS } from 'constants/tokens'
import { randomRevealToken, hashToken } from 'lib/api/managerCrypto'

// ─── MANAGER booking escrow ───────────────────────────────────────────────────
// The "booking whitelist" rail. A promoter connects a wallet, picks a token, and
// deposits the booking deposit on-chain; that deposit locks the date and unlocks
// the pro's pay-to-reveal payout details. This route is the off-chain twin (the
// Double Helix) of the on-chain ManagerBookingEscrow contract:
//   POST {action:'create'}  → mint an escrow record + the deposit destination +
//                              a one-time reveal token (public; no auth — a
//                              promoter need not be a SoundChain user).
//   POST {action:'confirm'} → attach the promoter's tx hash; VERIFY it on-chain
//                              (receipt.status === 1) before flipping to 'funded'
//                              and notifying the pro. Never a fake confirmation.
//   GET  ?escrowId=<id>      → public-safe escrow state (no secrets).
//
// Compliance: this is a service/performance deposit escrow, NOT wagering. It does
// not touch the paused Arena picks code in any way.

// Public EVM RPCs we can verify a deposit receipt against. A token sent to the
// 0x escrow/payout address lands on one of these EVM chains. Non-EVM deposits
// (native BTC/SOL) settle via the ZetaChain bridge + the pro's manual confirm —
// they come in as 'pending_verify', never as a falsely-confirmed 'funded'.
const RPC: Record<number, string> = {
  1: 'https://ethereum-rpc.publicnode.com',
  137: 'https://polygon-bor-rpc.publicnode.com',
  8453: 'https://base-rpc.publicnode.com',
  42161: 'https://arbitrum-one-rpc.publicnode.com',
  10: 'https://optimism-rpc.publicnode.com',
  43114: 'https://avalanche-c-chain-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
}

const webpush = (() => { try { return require('web-push') } catch { return null } })()
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

function clip(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

const TX_RE = /^0x[0-9a-fA-F]{64}$/

// Verify a deposit tx on its EVM chain. Returns:
//   'confirmed'  — mined, status 1 (real deposit)
//   'failed'     — mined, status 0 (reverted) → reject
//   'pending'    — not yet mined → ask the caller to retry
//   'unverifiable' — no RPC for that chain (non-EVM bridge) → accept as pending_verify
async function verifyDeposit(chainId: number, txHash: string): Promise<'confirmed' | 'failed' | 'pending' | 'unverifiable'> {
  const rpc = RPC[chainId]
  if (!rpc) return 'unverifiable'
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) return 'pending'
    return receipt.status === 1 ? 'confirmed' : 'failed'
  } catch (err) {
    console.error('[manager/escrow] verify error:', err)
    return 'unverifiable'
  }
}

// Light the pro's bell + fire a free Pulse web-push that money just landed.
// Best-effort: a notification hiccup never fails the deposit confirmation.
async function notifyPro(db: any, profileOid: ObjectId, token: string, amount: string, handle: string | undefined) {
  const body = `💰 Escrow funded — ${amount} ${token} deposit received for your booking`
  const link = handle ? `/manager/${handle}` : '/manage-requests'
  try {
    const now = new Date()
    await db.collection('notifications').insertOne({
      type: 'managerescrow',
      recipientProfileId: profileOid,
      toProfileId: profileOid,
      body,
      message: body,
      link,
      read: false,
      createdAt: now,
    })
    await db.collection('profiles').updateOne({ _id: profileOid }, { $inc: { unreadNotificationCount: 1 } })

    if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
      webpush.setVapidDetails('mailto:agents@soundchain.io', VAPID_PUBLIC, VAPID_PRIVATE)
      const user = await db.collection('users').findOne(
        { $or: [{ profileId: profileOid }, { profileId: profileOid.toString() }] },
        { projection: { _id: 1 } },
      )
      if (user) {
        const subs = await db.collection('pushsubscriptions').find({
          userId: { $in: [user._id.toString(), user._id] },
        }).toArray()
        const payload = JSON.stringify({
          title: '💰 Booking deposit received',
          body,
          icon: '/favicons/android-chrome-192x192.png',
          badge: '/favicons/favicon-32x32.png',
          tag: 'manager-escrow',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { url: link, type: 'manager_escrow' },
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
  } catch { /* notification is a bonus; the deposit is already recorded */ }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise
  const db = client.db('soundchain')
  const escrows = db.collection('managerEscrows')

  // ── GET: public-safe escrow state ──
  if (req.method === 'GET') {
    const escrowId = clip(req.query.escrowId, 64)
    if (!escrowId) return res.status(400).json({ error: 'escrowId required' })
    let oid: ObjectId
    try { oid = new ObjectId(escrowId) } catch { return res.status(400).json({ error: 'bad escrowId' }) }
    const doc = await escrows.findOne({ _id: oid })
    if (!doc) return res.status(404).json({ error: 'escrow not found' })
    return res.status(200).json({
      escrow: {
        id: doc._id.toString(),
        status: doc.status,
        token: doc.token,
        amount: doc.amount,
        destination: doc.destination,
        escrowContract: !!doc.escrowContract,
        txHash: doc.txHash || null,
        chainId: doc.chainId || null,
        createdAt: doc.createdAt,
      },
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' })

  const b = (req.body || {}) as Record<string, any>
  const action = clip(b.action, 16)

  // ── CREATE: mint an escrow record + deposit destination + reveal token ──
  if (action === 'create') {
    const profileId = clip(b.profileId, 64)
    const token = clip(b.token, 12).toUpperCase()
    const amount = clip(b.amount, 40)
    if (!profileId) return res.status(400).json({ error: 'profileId required' })
    if (!(SUPPORTED_TOKENS as readonly string[]).includes(token)) return res.status(400).json({ error: 'unsupported token' })
    if (!amount || !/[0-9]/.test(amount)) return res.status(400).json({ error: 'amount required' })

    let oid: ObjectId
    try { oid = new ObjectId(profileId) } catch { return res.status(400).json({ error: 'bad profileId' }) }

    const profile = await db.collection('profiles').findOne(
      { _id: oid },
      { projection: { _id: 1, userHandle: 1 } },
    )
    if (!profile) return res.status(404).json({ error: 'pro not found' })

    // Destination: the deployed escrow contract takes precedence (custodial,
    // release-on-performance); until it's deployed, the pro's own payout address
    // (non-custodial, still a real on-chain deposit that locks the date + reveals).
    const escrowContractAddr = clip(process.env.NEXT_PUBLIC_MANAGER_ESCROW_ADDRESS, 60)
    let destination = escrowContractAddr
    if (!destination) {
      const cfg = await db.collection('managerConfigs').findOne({ profileId: oid }, { projection: { payoutAddress: 1 } })
      destination = clip(cfg?.payoutAddress, 120)
    }
    if (!destination) return res.status(409).json({ error: 'This artist has not set up a crypto payout address yet.' })

    const revealToken = randomRevealToken()
    const now = new Date()
    const { insertedId } = await escrows.insertOne({
      profileId: oid,
      token,
      amount,
      destination,
      escrowContract: !!escrowContractAddr,
      payerName: clip(b.payerName, 120),
      payerEmail: clip(b.payerEmail, 200),
      inquiryId: clip(b.inquiryId, 64) || null,
      note: clip(b.note, 500),
      status: 'open',
      revealTokenHash: hashToken(revealToken),
      createdAt: now,
    })

    return res.status(200).json({
      escrowId: insertedId.toString(),
      destination,
      escrowContract: !!escrowContractAddr,
      revealToken, // handed to the promoter ONCE; unlocks pay-to-reveal after funding
      token,
      amount,
      status: 'open',
    })
  }

  // ── CONFIRM: attach + verify the deposit tx, flip to funded, notify the pro ──
  if (action === 'confirm') {
    const escrowId = clip(b.escrowId, 64)
    const txHash = clip(b.txHash, 80)
    const chainId = Number(b.chainId) || 0
    const fromAddress = clip(b.fromAddress, 60)
    if (!escrowId) return res.status(400).json({ error: 'escrowId required' })
    if (!TX_RE.test(txHash)) return res.status(400).json({ error: 'valid txHash required' })

    let oid: ObjectId
    try { oid = new ObjectId(escrowId) } catch { return res.status(400).json({ error: 'bad escrowId' }) }
    const escrow = await escrows.findOne({ _id: oid })
    if (!escrow) return res.status(404).json({ error: 'escrow not found' })
    if (escrow.status === 'funded') {
      return res.status(200).json({ ok: true, status: 'funded', revealUnlocked: true }) // idempotent
    }

    const result = await verifyDeposit(chainId, txHash)
    if (result === 'failed') {
      return res.status(400).json({ error: 'That transaction reverted on-chain — no funds were transferred.' })
    }
    if (result === 'pending') {
      // Real tx, not yet mined. Don't record as funded; tell the promoter to retry.
      return res.status(202).json({ ok: false, status: 'pending', message: 'Transaction not yet confirmed on-chain. Try again in a moment.' })
    }

    // 'confirmed' (EVM, status 1) → funded. 'unverifiable' (non-EVM bridge) →
    // pending_verify, awaiting the pro's manual receipt confirmation. Either way
    // the tx + payer are recorded; the reveal only unlocks on a true 'funded'.
    const status = result === 'confirmed' ? 'funded' : 'pending_verify'
    await escrows.updateOne(
      { _id: oid },
      { $set: { status, txHash, chainId, fromAddress, fundedAt: new Date() } },
    )

    const profile = await db.collection('profiles').findOne(
      { _id: escrow.profileId },
      { projection: { userHandle: 1 } },
    )
    await notifyPro(db, escrow.profileId, escrow.token, escrow.amount, profile?.userHandle)

    return res.status(200).json({
      ok: true,
      status,
      revealUnlocked: status === 'funded',
      message: status === 'funded'
        ? 'Deposit confirmed on-chain. The booking date is locked.'
        : 'Deposit recorded. The artist will confirm receipt to unlock the reveal.',
    })
  }

  // ── MARK RECEIVED (owner): confirm a non-EVM bridge deposit was received,
  //    flipping pending_verify → funded so its pay-to-reveal unlocks. Owner-only,
  //    and only on the caller's OWN escrow. ──
  if (action === 'markReceived') {
    const auth = await authFromRequest(req)
    if (!auth) return res.status(401).json({ error: 'Unauthenticated' })
    const escrowId = clip(b.escrowId, 64)
    if (!escrowId) return res.status(400).json({ error: 'escrowId required' })
    let oid: ObjectId
    try { oid = new ObjectId(escrowId) } catch { return res.status(400).json({ error: 'bad escrowId' }) }

    const escrow = await escrows.findOne({ _id: oid })
    if (!escrow) return res.status(404).json({ error: 'escrow not found' })
    if (String(escrow.profileId) !== String(auth.profileId)) {
      return res.status(403).json({ error: 'Not your booking.' })
    }
    if (escrow.status === 'funded') return res.status(200).json({ ok: true, status: 'funded' })
    if (escrow.status !== 'open' && escrow.status !== 'pending_verify') {
      return res.status(409).json({ error: 'Only a pending deposit can be marked received.' })
    }
    await escrows.updateOne({ _id: oid }, { $set: { status: 'funded', receivedAt: new Date() } })
    return res.status(200).json({ ok: true, status: 'funded', revealUnlocked: true })
  }

  return res.status(400).json({ error: 'unknown action' })
}
