/**
 * SMITH — OGUN Credit System
 * POST /api/agent/smith/credits  — Purchase credits with OGUN (verify tx hash)
 * GET  /api/agent/smith/credits  — Check credit balance for wallet
 *
 * Users burn/transfer OGUN to treasury → get AI credits.
 * Every OGUN purchase hits the 0.05% fee collector on-chain,
 * driving treasury revenue and OGUN token demand.
 *
 * Credit tiers (OGUN → credits):
 *   10 OGUN  →  100 credits  (chat messages)
 *   50 OGUN  →  600 credits  (20% bonus)
 *  100 OGUN  → 1500 credits  (50% bonus)
 *  500 OGUN  → 10000 credits (100% bonus — whale tier)
 *
 * Image generation:  5 credits per image
 * Image-to-video:   15 credits per video
 * Chat message:      1 credit per message
 * Forge query:       2 credits per query
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// ─── Credit Tiers ──────────────────────────────────────────────────

const CREDIT_TIERS = [
  { ogun: 10,  credits: 100,   label: 'Starter',  bonus: '0%' },
  { ogun: 50,  credits: 600,   label: 'Pro',      bonus: '20%' },
  { ogun: 100, credits: 1500,  label: 'Elite',    bonus: '50%' },
  { ogun: 500, credits: 10000, label: 'Whale',    bonus: '100%' },
] as const

const CREDIT_COSTS = {
  CHAT_MESSAGE: 1,
  FORGE_QUERY: 2,
  IMAGE_GENERATE: 5,
  IMAGE_TO_VIDEO: 15,
  IMAGE_EDIT: 5,
  CODE_ASSIST: 2,
  WEB_SEARCH: 3,
} as const

const VERIFY_VERDICT = {
  CREDITED: 'CREDITED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  INVALID_TX: 'INVALID_TX',
  REJECTED: 'REJECTED',
  BALANCE: 'BALANCE',
} as const

// ─── In-Memory Store (MongoDB integration TODO) ─────────────────

interface WalletCredits {
  credits: number
  totalPurchased: number
  totalSpent: number
  lastPurchase: number
  transactions: string[] // tx hashes claimed
}

const creditStore: Map<string, WalletCredits> =
  (global as any).__smithCreditStore || new Map()
if (!(global as any).__smithCreditStore) {
  ;(global as any).__smithCreditStore = creditStore
}

const claimedTxHashes: Set<string> =
  (global as any).__smithClaimedTxHashes || new Set()
if (!(global as any).__smithClaimedTxHashes) {
  ;(global as any).__smithClaimedTxHashes = claimedTxHashes
}

// Treasury address (Gnosis Safe)
const TREASURY = '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b'
const OGUN_CONTRACT = '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'

// ─── Verify OGUN Transfer on Polygon ────────────────────────────

async function verifyOgunTransfer(
  txHash: string,
  expectedSender: string,
): Promise<{ verified: string; ogunAmount: number }> {
  try {
    // Fetch transaction receipt from Polygon RPC
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com'
    const receiptResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    })

    const receiptData = await receiptResp.json()
    const receipt = receiptData?.result

    if (!receipt || receipt.status !== '0x1') {
      return { verified: 'FAILED', ogunAmount: 0 }
    }

    // Check logs for ERC-20 Transfer event to treasury
    // Transfer(address,address,uint256) = 0xddf252ad...
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const treasuryPadded = '0x' + TREASURY.slice(2).toLowerCase().padStart(64, '0')
    const senderPadded = '0x' + expectedSender.slice(2).toLowerCase().padStart(64, '0')

    for (const log of receipt.logs || []) {
      if (
        log.address?.toLowerCase() === OGUN_CONTRACT &&
        log.topics?.[0] === transferTopic &&
        log.topics?.[1]?.toLowerCase() === senderPadded &&
        log.topics?.[2]?.toLowerCase() === treasuryPadded
      ) {
        // Decode amount (uint256 in data field)
        const rawAmount = BigInt(log.data)
        // OGUN has 18 decimals
        const ogunAmount = Number(rawAmount / BigInt(10 ** 18))
        return { verified: 'SUCCESS', ogunAmount }
      }
    }

    return { verified: 'NO_TRANSFER_FOUND', ogunAmount: 0 }
  } catch {
    return { verified: 'RPC_ERROR', ogunAmount: 0 }
  }
}

// ─── Map OGUN amount to credits ─────────────────────────────────

function ogunToCredits(ogunAmount: number): number {
  // Find best matching tier (highest that fits)
  let bestTier = CREDIT_TIERS[0]
  for (const tier of CREDIT_TIERS) {
    if (ogunAmount >= tier.ogun) bestTier = tier
  }

  if (ogunAmount < CREDIT_TIERS[0].ogun) {
    // Below minimum — proportional credits (no bonus)
    return Math.floor(ogunAmount * 10)
  }

  // Scale credits proportionally from the tier rate
  const rate = bestTier.credits / bestTier.ogun
  return Math.floor(ogunAmount * rate)
}

// ─── Get or create wallet entry ─────────────────────────────────

function getWallet(address: string): WalletCredits {
  const key = address.toLowerCase()
  let wallet = creditStore.get(key)
  if (!wallet) {
    wallet = {
      credits: 0,
      totalPurchased: 0,
      totalSpent: 0,
      lastPurchase: 0,
      transactions: [],
    }
    creditStore.set(key, wallet)
  }
  return wallet
}

// ─── Handler ────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET — check balance
  if (req.method === 'GET') {
    const { wallet } = req.query
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ verdict: VERIFY_VERDICT.REJECTED, reason: 'Missing wallet address' })
    }

    const entry = getWallet(wallet)
    return res.status(200).json({
      verdict: VERIFY_VERDICT.BALANCE,
      wallet: wallet.toLowerCase(),
      credits: entry.credits,
      totalPurchased: entry.totalPurchased,
      totalSpent: entry.totalSpent,
      lastPurchase: entry.lastPurchase,
      tiers: CREDIT_TIERS,
      costs: CREDIT_COSTS,
      treasury: TREASURY,
      ogunContract: OGUN_CONTRACT,
    })
  }

  // POST — claim credits from tx hash
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: VERIFY_VERDICT.REJECTED, reason: 'Method not allowed' })
  }

  const { txHash, wallet: senderWallet } = req.body || {}

  if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
    return res.status(400).json({ verdict: VERIFY_VERDICT.REJECTED, reason: 'Invalid txHash' })
  }

  if (!senderWallet || typeof senderWallet !== 'string') {
    return res.status(400).json({ verdict: VERIFY_VERDICT.REJECTED, reason: 'Missing wallet address' })
  }

  // Check if already claimed
  if (claimedTxHashes.has(txHash.toLowerCase())) {
    return res.status(409).json({ verdict: VERIFY_VERDICT.ALREADY_CLAIMED })
  }

  // Verify on-chain
  const { verified, ogunAmount } = await verifyOgunTransfer(txHash, senderWallet)

  if (verified !== 'SUCCESS' || ogunAmount <= 0) {
    return res.status(400).json({
      verdict: VERIFY_VERDICT.INVALID_TX,
      reason: `Verification: ${verified}. Must be OGUN transfer to treasury ${TREASURY}`,
    })
  }

  // Calculate credits
  const credits = ogunToCredits(ogunAmount)

  // Credit the wallet
  const entry = getWallet(senderWallet)
  entry.credits += credits
  entry.totalPurchased += credits
  entry.lastPurchase = Date.now()
  entry.transactions.push(txHash.toLowerCase())
  claimedTxHashes.add(txHash.toLowerCase())

  return res.status(200).json({
    verdict: VERIFY_VERDICT.CREDITED,
    ogunAmount,
    creditsAdded: credits,
    totalCredits: entry.credits,
    tier: CREDIT_TIERS.find((t) => ogunAmount >= t.ogun)?.label || 'Custom',
  })
}
