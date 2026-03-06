/**
 * HD Wallet Server-Side Transaction Signing
 *
 * POST /api/hd-wallet/sign-tx
 *
 * Signs a transaction using the user's HD wallet derived from HUMAN_WALLET_SEED.
 * Completely bypasses Magic SDK - no relay dependency.
 *
 * Auth: JWT from cookie (verified via GraphQL Me query)
 * Returns: { success: true, txHash: string } after broadcasting
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import crypto from 'crypto'

const POLYGON_RPC = process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com'
const GRAPHQL_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'
const HUMAN_WALLET_SEED = process.env.HUMAN_WALLET_SEED

const ME_QUERY = `
  query Me {
    me {
      id
      profileId
      hdWalletAddress
      magicWalletAddress
      googleWalletAddress
      discordWalletAddress
      twitchWalletAddress
      emailWalletAddress
    }
  }
`

function userIdToIndex(userId: string): number {
  const hash = crypto.createHash('sha256').update(userId.toLowerCase()).digest('hex')
  return parseInt(hash.slice(0, 8), 16)
}

function deriveHumanWallet(userId: string): ethers.Wallet | null {
  if (!HUMAN_WALLET_SEED) return null
  try {
    const index = userIdToIndex(userId)
    const path = `m/44'/60'/1'/0/${index}`
    return ethers.Wallet.fromMnemonic(HUMAN_WALLET_SEED, path)
  } catch {
    return null
  }
}

// Simple rate limiter: 1 tx per 3 seconds per user
const lastSignTime = new Map<string, number>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const requestId = `hdtx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    // 1. Get JWT from cookie
    const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
    if (!jwt) {
      return res.status(401).json({ success: false, error: 'Not authenticated', meta: { request_id: requestId } })
    }

    // 2. Verify user via GraphQL Me query
    const meResponse = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ query: ME_QUERY }),
    })

    const meData = await meResponse.json()
    const me = meData?.data?.me
    if (!me?.id) {
      return res.status(401).json({ success: false, error: 'Invalid session', meta: { request_id: requestId } })
    }

    if (!me.hdWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No HD wallet configured. Generate one first.',
        meta: { request_id: requestId },
      })
    }

    // 3. Check seed is configured
    if (!HUMAN_WALLET_SEED) {
      return res.status(500).json({
        success: false,
        error: 'HD wallet system not configured on this server',
        meta: { request_id: requestId },
      })
    }

    // 4. Rate limit
    const now = Date.now()
    const lastTime = lastSignTime.get(me.id)
    if (lastTime && now - lastTime < 3000) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Wait 3 seconds between transactions.',
        meta: { request_id: requestId },
      })
    }
    lastSignTime.set(me.id, now)

    // 5. Derive HD wallet and verify address matches
    // Use profileId for derivation (matches backend AuthService registration flow)
    const wallet = deriveHumanWallet(me.profileId || me.id)
    if (!wallet) {
      return res.status(500).json({ success: false, error: 'Failed to derive wallet', meta: { request_id: requestId } })
    }

    if (wallet.address.toLowerCase() !== me.hdWalletAddress.toLowerCase()) {
      return res.status(500).json({
        success: false,
        error: 'Wallet address mismatch - seed configuration error',
        meta: { request_id: requestId },
      })
    }

    // 6. Parse transaction data
    const { to, data, value, gas, gasPrice } = req.body
    if (!to || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, data',
        meta: { request_id: requestId },
      })
    }

    if (!ethers.utils.isAddress(to)) {
      return res.status(400).json({ success: false, error: 'Invalid to address', meta: { request_id: requestId } })
    }

    // 7. Connect wallet to provider and send transaction
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const signer = wallet.connect(provider)

    const nonce = await provider.getTransactionCount(wallet.address, 'pending')
    const resolvedGasPrice = gasPrice
      ? ethers.BigNumber.from(String(gasPrice))
      : (await provider.getGasPrice()).mul(120).div(100) // 20% buffer

    const txObj: ethers.providers.TransactionRequest = {
      to,
      data,
      gasLimit: gas || 300000,
      gasPrice: resolvedGasPrice,
      nonce,
      chainId: 137,
    }

    if (value && value !== '0' && value !== '0x0') {
      txObj.value = ethers.BigNumber.from(String(value))
    }

    const tx = await signer.sendTransaction(txObj)

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      from: wallet.address,
      nonce,
      meta: { request_id: requestId },
    })
  } catch (err: any) {
    console.error('[HD Wallet Sign TX] Error:', err?.message)

    // Parse revert reasons
    const errorMsg = err?.reason || err?.error?.message || err?.message || 'Transaction failed'
    const isInsufficientFunds = errorMsg.includes('insufficient funds') || errorMsg.includes('underpriced')

    return res.status(isInsufficientFunds ? 400 : 500).json({
      success: false,
      error: errorMsg,
      meta: { request_id: requestId },
    })
  }
}
