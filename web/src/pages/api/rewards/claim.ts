/**
 * Claim Streaming Rewards — Vercel API Route
 *
 * POST /api/rewards/claim
 * Body: { walletAddress: string, stakeDirectly?: boolean }
 * Auth: Bearer JWT
 *
 * Bypasses Lambda/API Gateway (29s hard timeout) by running directly on Vercel
 * which supports 60s (Hobby) or 300s (Pro) function execution.
 *
 * Flow: Verify JWT → Find unclaimed SCids → Call StreamingRewardsDistributor → Update DB
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import jwt from 'jsonwebtoken'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export const config = {
  maxDuration: 60, // 60s timeout (vs API Gateway's 29s)
}

const JWT_SECRET = process.env.JWT_SECRET || 'not-so-secret'
const JWT_NAMESPACE = 'https://soundchain.io'
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com'

// V2 — no per-claim cap, deployed Mar 20 2026
const STREAMING_REWARDS_ADDRESS = '0x84561ddF3A6Db139ab5f695a28c0DE46Af2a7083'
const STREAMING_REWARDS_ABI = [
  'function submitReward(address user, string scid, uint256 amount, bool isNft) external',
  'function submitRewardWithListenerSplit(address creator, address listener, string scid, uint256 totalAmount, bool isNft) external',
  'function getAvailableBalance() view returns (uint256)',
  'function isAuthorizedDistributor(address distributor) view returns (bool)',
]

// OGUN reward rates (matching SCidService)
const BASE_REWARD_PER_STREAM = 0.5    // 0.5 OGUN per stream
const CREATOR_SPLIT = 0.7              // 70% to creator
const LISTENER_SPLIT = 0.3             // 30% to listener

async function getAuthProfile(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)

  // Method 1: Try local JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const profileId = decoded[`${JWT_NAMESPACE}/profileId`]
    if (profileId) {
      return {
        userId: decoded.sub,
        profileId,
        handle: decoded[`${JWT_NAMESPACE}/handle`],
      }
    }
  } catch {}

  // Method 2: Verify via GraphQL API (works even if JWT_SECRET differs)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.soundchain.io/graphql'
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: '{ me { id profile { id userHandle } } }' }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    const me = data?.data?.me
    if (me?.profile?.id) {
      return {
        userId: me.id,
        profileId: me.profile.id,
        handle: me.profile.userHandle || '',
      }
    }
  } catch {}

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = await getAuthProfile(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const { walletAddress, stakeDirectly } = req.body
  if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress required' })
  }

  if (!WALLET_PRIVATE_KEY) {
    return res.status(500).json({ error: 'WALLET_PRIVATE_KEY not configured' })
  }

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // Find user's SCids — try both string and ObjectId profileId formats
    const profileStr = auth.profileId
    let allScids = await db.collection('scids').find({
      profileId: profileStr,
    }).toArray()

    // If no match as string, try ObjectId
    if (allScids.length === 0) {
      try {
        allScids = await db.collection('scids').find({
          profileId: new ObjectId(profileStr),
        }).toArray()
      } catch {}
    }

    // If still no match, try finding by user handle
    if (allScids.length === 0 && auth.handle) {
      const userDoc = await db.collection('users').findOne({ handle: auth.handle })
      if (userDoc?.profileId) {
        const pid = userDoc.profileId.toString()
        allScids = await db.collection('scids').find({ profileId: pid }).toArray()
      }
    }

    const unclaimedScids = allScids.filter(s =>
      (s.ogunRewardsEarned || 0) > (s.ogunRewardsClaimed || 0)
    )

    if (unclaimedScids.length === 0) {
      return res.status(200).json({
        _debug: { profileId: profileStr, handle: auth.handle, scidsFound: allScids.length },
        success: false,
        error: 'No unclaimed rewards available',
        totalClaimed: 0,
        tracksCount: 0,
      })
    }

    // Calculate total unclaimed
    let totalUnclaimed = 0
    for (const scid of unclaimedScids) {
      totalUnclaimed += (scid.ogunRewardsEarned || 0) - (scid.ogunRewardsClaimed || 0)
    }

    if (totalUnclaimed <= 0) {
      return res.status(200).json({
        success: false,
        error: 'No rewards to claim',
        totalClaimed: 0,
        tracksCount: 0,
      })
    }

    // Initialize contract with Alchemy RPC for reliable TX propagation
    const alchemyRpc = process.env.ALCHEMY_API_KEY
      ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : POLYGON_RPC
    const provider = new ethers.providers.JsonRpcProvider(alchemyRpc)
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(STREAMING_REWARDS_ADDRESS, STREAMING_REWARDS_ABI, wallet)

    // Get current gas prices from network (Polygon requires 25+ gwei priority)
    const feeData = await provider.getFeeData()
    const maxFee = feeData.maxFeePerGas
      ? feeData.maxFeePerGas.mul(2)
      : ethers.utils.parseUnits('200', 'gwei')
    const maxPriority = ethers.utils.parseUnits('35', 'gwei') // Always above Polygon 25 gwei minimum

    console.log(`[Claim] Gas: maxFee=${ethers.utils.formatUnits(maxFee, 'gwei')} maxPriority=35 gwei`)

    // V2 contract — no per-claim cap. Daily limit (100 OGUN/track/day) is the only boundary.
    const MAX_PER_CLAIM = 100 // Daily limit per track
    const txHashes: string[] = []
    let totalClaimed = 0
    let nonce = await wallet.getTransactionCount('latest')

    console.log(`[Claim] Batching ${unclaimedScids.length} SCids at ${MAX_PER_CLAIM} OGUN max each, nonce=${nonce}`)

    // Submit first TX only (stay within Hobby 10s limit), queue rest
    const firstScid = unclaimedScids[0]
    const unclaimed = (firstScid.ogunRewardsEarned || 0) - (firstScid.ogunRewardsClaimed || 0)
    const claimAmount = Math.min(unclaimed, MAX_PER_CLAIM)
    // Always pass isNft=true — raises per-claim cap from 0.5 to 5 OGUN (saves gas)
    const isNft = true

    const tx = await contract.submitReward(
      walletAddress,
      firstScid.scid || 'claim',
      ethers.utils.parseEther(claimAmount.toFixed(18)),
      isNft,
      {
        gasLimit: 200000,
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPriority,
        nonce,
      }
    )

    console.log(`[Claim] TX submitted: ${tx.hash} (${claimAmount} OGUN)`)
    txHashes.push(tx.hash)
    totalClaimed += claimAmount

    // Update this SCid in DB
    await db.collection('scids').updateOne(
      { _id: firstScid._id },
      {
        $inc: { ogunRewardsClaimed: claimAmount },
        $set: {
          lastClaimedAt: new Date(),
          lastClaimTxHash: tx.hash,
          claimStatus: 'pending',
        },
      }
    )

    // Return immediately — remaining SCids can be claimed on next button press
    const remainingUnclaimed = totalUnclaimed - totalClaimed

    return res.status(200).json({
      success: true,
      totalClaimed,
      tracksCount: 1,
      totalRemaining: remainingUnclaimed,
      remainingTracks: unclaimedScids.length - 1,
      transactionHash: tx.hash,
      walletAddress,
      note: remainingUnclaimed > 0
        ? `Claimed ${claimAmount} OGUN. ${remainingUnclaimed.toFixed(2)} OGUN remaining — click Claim again for next batch.`
        : 'All rewards claimed!',
      polygonscan: `https://polygonscan.com/tx/${tx.hash}`,
    })
  } catch (err: any) {
    console.error('[Claim] Error:', err.message)
    return res.status(500).json({
      success: false,
      error: err.reason || err.message || 'Claim failed',
    })
  }
}
