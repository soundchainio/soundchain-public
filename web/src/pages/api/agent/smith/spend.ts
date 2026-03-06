/**
 * SMITH — Credit Spend Middleware
 * POST /api/agent/smith/spend
 *
 * Deducts credits from wallet balance before AI operations.
 * Called internally by image-gen, video-gen, and chat endpoints.
 * Also callable directly for pre-flight balance checks.
 *
 * Zero booleans.
 */

import type { NextApiRequest, NextApiResponse } from 'next'

const CREDIT_COSTS: Record<string, number> = {
  CHAT_MESSAGE: 1,
  FORGE_QUERY: 2,
  IMAGE_GENERATE: 5,
  IMAGE_TO_VIDEO: 15,
  IMAGE_EDIT: 5,
  CODE_ASSIST: 2,
  WEB_SEARCH: 3,
}

const SPEND_VERDICT = {
  SPENT: 'SPENT',
  INSUFFICIENT: 'INSUFFICIENT',
  CHECK: 'CHECK',
  REJECTED: 'REJECTED',
} as const

interface WalletCredits {
  credits: number
  totalPurchased: number
  totalSpent: number
  lastPurchase: number
  transactions: string[]
}

// Same global store as credits.ts
const creditStore: Map<string, WalletCredits> =
  (global as any).__smithCreditStore || new Map()
if (!(global as any).__smithCreditStore) {
  ;(global as any).__smithCreditStore = creditStore
}

export function getCredits(wallet: string): number {
  const entry = creditStore.get(wallet.toLowerCase())
  return entry?.credits ?? 0
}

export function spendCredits(wallet: string, operation: string): { success: string; remaining: number; cost: number } {
  const cost = CREDIT_COSTS[operation]
  if (!cost) return { success: 'INVALID_OPERATION', remaining: 0, cost: 0 }

  const key = wallet.toLowerCase()
  const entry = creditStore.get(key)
  if (!entry || entry.credits < cost) {
    return { success: 'INSUFFICIENT', remaining: entry?.credits ?? 0, cost }
  }

  entry.credits -= cost
  entry.totalSpent += cost
  return { success: 'SPENT', remaining: entry.credits, cost }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verdict: SPEND_VERDICT.REJECTED })
  }

  const { wallet, operation, checkOnly } = req.body || {}

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ verdict: SPEND_VERDICT.REJECTED, reason: 'Missing wallet' })
  }

  if (!operation || !CREDIT_COSTS[operation]) {
    return res.status(400).json({
      verdict: SPEND_VERDICT.REJECTED,
      reason: `Invalid operation. Valid: ${Object.keys(CREDIT_COSTS).join(', ')}`,
    })
  }

  const credits = getCredits(wallet)
  const cost = CREDIT_COSTS[operation]

  // Check-only mode (pre-flight)
  if (checkOnly === 'YES') {
    const canAfford = credits >= cost ? 'YES' : 'NO'
    return res.status(200).json({
      verdict: SPEND_VERDICT.CHECK,
      canAfford,
      credits,
      cost,
      operation,
    })
  }

  // Spend
  const result = spendCredits(wallet, operation)

  if (result.success !== 'SPENT') {
    return res.status(402).json({
      verdict: SPEND_VERDICT.INSUFFICIENT,
      credits,
      cost,
      operation,
      buyUrl: '/api/agent/smith/credits',
    })
  }

  return res.status(200).json({
    verdict: SPEND_VERDICT.SPENT,
    remaining: result.remaining,
    cost: result.cost,
    operation,
  })
}
