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

const STREAMING_REWARDS_ADDRESS = '0xcf9416c49D525f7a50299c71f33606A158F28546'
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

function getAuthProfile(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any
    return {
      userId: decoded.sub,
      profileId: decoded[`${JWT_NAMESPACE}/profileId`],
      handle: decoded[`${JWT_NAMESPACE}/handle`],
    }
  } catch { return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const auth = getAuthProfile(req)
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

    // Initialize contract
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(STREAMING_REWARDS_ADDRESS, STREAMING_REWARDS_ABI, wallet)

    // Verify distributor is authorized
    const isAuth = await contract.isAuthorizedDistributor(wallet.address)
    if (!isAuth) {
      return res.status(500).json({
        error: 'Distributor wallet not authorized on contract',
        distributorAddress: wallet.address,
      })
    }

    // Check contract balance
    const balance = await contract.getAvailableBalance()
    const balanceOgun = parseFloat(ethers.utils.formatEther(balance))
    if (balanceOgun < totalUnclaimed) {
      return res.status(500).json({
        error: `Insufficient contract balance. Available: ${balanceOgun.toFixed(2)} OGUN, Needed: ${totalUnclaimed.toFixed(2)} OGUN`,
      })
    }

    // Submit reward on-chain
    const amountWei = ethers.utils.parseEther(totalUnclaimed.toFixed(18))
    const firstScid = unclaimedScids[0].scid || 'batch-claim'
    const isNft = unclaimedScids.some(s => s.contractAddress)

    console.log(`[Claim] Submitting ${totalUnclaimed.toFixed(4)} OGUN to ${walletAddress} for ${unclaimedScids.length} tracks`)

    const tx = await contract.submitReward(
      walletAddress,
      firstScid,
      amountWei,
      isNft,
      {
        gasLimit: 200000,
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
      }
    )

    console.log(`[Claim] TX submitted: ${tx.hash}`)

    // Wait for confirmation
    const receipt = await tx.wait(1)
    console.log(`[Claim] TX confirmed in block ${receipt.blockNumber}`)

    // Update DB — mark all SCids as claimed
    for (const scid of unclaimedScids) {
      await db.collection('scids').updateOne(
        { _id: scid._id },
        {
          $set: {
            ogunRewardsClaimed: scid.ogunRewardsEarned || 0,
            lastClaimedAt: new Date(),
            lastClaimTxHash: receipt.transactionHash,
          },
        }
      )
    }

    return res.status(200).json({
      success: true,
      totalClaimed: totalUnclaimed,
      tracksCount: unclaimedScids.length,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      walletAddress,
    })
  } catch (err: any) {
    console.error('[Claim] Error:', err.message)
    return res.status(500).json({
      success: false,
      error: err.reason || err.message || 'Claim failed',
    })
  }
}
