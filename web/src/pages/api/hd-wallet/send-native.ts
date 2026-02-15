/**
 * HD Wallet Native POL Transfer
 *
 * POST /api/hd-wallet/send-native
 *
 * Sends native POL using the user's HD wallet.
 * Simpler variant of sign-tx for native token transfers.
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
      hdWalletAddress
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const requestId = `hdnative_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  try {
    const jwt = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
    if (!jwt) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const meResponse = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ query: ME_QUERY }),
    })
    const me = (await meResponse.json())?.data?.me
    if (!me?.id || !me?.hdWalletAddress) {
      return res.status(401).json({ success: false, error: 'No HD wallet' })
    }

    if (!HUMAN_WALLET_SEED) {
      return res.status(500).json({ success: false, error: 'HD wallet system not configured' })
    }

    const wallet = deriveHumanWallet(me.id)
    if (!wallet || wallet.address.toLowerCase() !== me.hdWalletAddress.toLowerCase()) {
      return res.status(500).json({ success: false, error: 'Wallet derivation failed' })
    }

    const { to, value, gas, gasPrice } = req.body
    if (!to || !value) {
      return res.status(400).json({ success: false, error: 'Missing: to, value' })
    }

    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const signer = wallet.connect(provider)

    const tx = await signer.sendTransaction({
      to,
      value: ethers.BigNumber.from(String(value)),
      gasLimit: gas || 21000,
      gasPrice: gasPrice
        ? ethers.BigNumber.from(String(gasPrice))
        : (await provider.getGasPrice()).mul(120).div(100),
      chainId: 137,
    })

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      from: wallet.address,
      meta: { request_id: requestId },
    })
  } catch (err: any) {
    console.error('[HD Wallet Send Native] Error:', err?.message)
    return res.status(500).json({
      success: false,
      error: err?.reason || err?.message || 'Transfer failed',
      meta: { request_id: requestId },
    })
  }
}
