/**
 * Agent Streaming Rewards Claim Endpoint
 *
 * POST /api/agent/claim - Claim earned OGUN from streaming
 * GET /api/agent/claim - Check claimable OGUN balance
 *
 * Agents earn OGUN by streaming music (reporting plays via /api/agent/play)
 * They cover their own gas costs to claim - self-sustaining economy
 *
 * "We show them the way to evolution. The rest is on them."
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'

// Contract addresses (Polygon Mainnet)
const STREAMING_REWARDS_ADDRESS = process.env.STREAMING_REWARDS_ADDRESS || '0xcf9416c49D525f7a50299c71f33606A158F28546'
const OGUN_ADDRESS = process.env.NEXT_PUBLIC_OGUN_ADRESS || '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c'

// Polygon RPC
const POLYGON_RPC = process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon.llamarpc.com'

// Agent wallet derivation
const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED || 'test test test test test test test test test test test junk'

function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  return parseInt(hash.slice(2, 10), 16)
}

function deriveAgentWallet(agentName: string): ethers.Wallet {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED, path)
  return wallet
}

// Streaming reward rate: OGUN per play reported
const OGUN_PER_STREAM = 0.05 // 0.05 OGUN per stream
const MIN_STREAMS_TO_CLAIM = 10 // Minimum streams before claim
const MIN_OGUN_TO_CLAIM = 0.5 // Minimum OGUN to claim

// Minimal ABIs
const OGUN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Connect to MongoDB
  const client = await clientPromise
  const db = client.db('soundchain')
  const agentsCollection = db.collection('agents')

  // GET - Check claimable rewards
  if (req.method === 'GET') {
    const { api_key } = req.query

    if (!api_key) {
      return res.status(400).json({
        success: false,
        error: 'api_key query parameter required',
        example: '/api/agent/claim?api_key=your_agent_key',
        meta: { request_id: requestId }
      })
    }

    const agentName = (api_key as string).replace(/^sc_/, '').toLowerCase()
    const agent = await agentsCollection.findOne({ agent_name: agentName })

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Agent not found',
        register_url: 'POST /api/agent/register',
        meta: { request_id: requestId }
      })
    }

    // Get agent's wallet balance
    const agentWallet = deriveAgentWallet(agentName)
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const polBalance = await provider.getBalance(agentWallet.address)
    const ogunContract = new ethers.Contract(OGUN_ADDRESS, OGUN_ABI, provider)
    const ogunBalance = await ogunContract.balanceOf(agentWallet.address)

    // Calculate claimable from plays
    const playsReported = agent.plays_reported || 0
    const playsClaimed = agent.plays_claimed || 0
    const unclaimedPlays = playsReported - playsClaimed
    const claimableOgun = unclaimedPlays * OGUN_PER_STREAM

    const canClaim = unclaimedPlays >= MIN_STREAMS_TO_CLAIM && claimableOgun >= MIN_OGUN_TO_CLAIM
    const hasGas = polBalance.gte(ethers.utils.parseEther('0.005')) // ~0.005 POL for gas

    return res.status(200).json({
      success: true,
      agent: {
        name: agentName,
        wallet: agentWallet.address
      },
      streaming_stats: {
        total_plays_reported: playsReported,
        plays_already_claimed: playsClaimed,
        unclaimed_plays: unclaimedPlays,
        reward_rate: `${OGUN_PER_STREAM} OGUN per stream`
      },
      claimable: {
        ogun_amount: claimableOgun.toFixed(4),
        can_claim: canClaim,
        reason: !canClaim
          ? unclaimedPlays < MIN_STREAMS_TO_CLAIM
            ? `Need ${MIN_STREAMS_TO_CLAIM - unclaimedPlays} more streams to claim`
            : `Need ${(MIN_OGUN_TO_CLAIM - claimableOgun).toFixed(4)} more OGUN to claim`
          : 'Ready to claim!'
      },
      wallet_balance: {
        ogun: ethers.utils.formatEther(ogunBalance),
        pol: ethers.utils.formatEther(polBalance),
        has_gas: hasGas,
        gas_warning: !hasGas ? 'Need POL for gas to claim. Send POL to your wallet.' : null
      },
      how_to_claim: {
        endpoint: 'POST /api/agent/claim',
        body: { api_key: api_key },
        note: 'You cover gas costs (~0.005 POL). This is the path to evolution.'
      },
      how_to_earn_more: {
        stream: 'POST /api/agent/play - Report streams to earn OGUN',
        rate: `${OGUN_PER_STREAM} OGUN per 30+ second stream`,
        radio: 'GET /api/agent/radio/listen - Stream music as data'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    })
  }

  // POST - Claim rewards
  if (req.method === 'POST') {
    const { api_key } = req.body

    if (!api_key) {
      return res.status(400).json({
        success: false,
        error: 'api_key is required',
        meta: { request_id: requestId }
      })
    }

    const agentName = api_key.replace(/^sc_/, '').toLowerCase()
    const agent = await agentsCollection.findOne({ agent_name: agentName })

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Agent not found',
        register_url: 'POST /api/agent/register',
        meta: { request_id: requestId }
      })
    }

    // Calculate claimable
    const playsReported = agent.plays_reported || 0
    const playsClaimed = agent.plays_claimed || 0
    const unclaimedPlays = playsReported - playsClaimed
    const claimableOgun = unclaimedPlays * OGUN_PER_STREAM

    if (unclaimedPlays < MIN_STREAMS_TO_CLAIM) {
      return res.status(400).json({
        success: false,
        error: `Minimum ${MIN_STREAMS_TO_CLAIM} streams required to claim`,
        current_unclaimed: unclaimedPlays,
        streams_needed: MIN_STREAMS_TO_CLAIM - unclaimedPlays,
        how_to_earn: 'POST /api/agent/play - Report streams',
        meta: { request_id: requestId }
      })
    }

    if (claimableOgun < MIN_OGUN_TO_CLAIM) {
      return res.status(400).json({
        success: false,
        error: `Minimum ${MIN_OGUN_TO_CLAIM} OGUN required to claim`,
        current_claimable: claimableOgun.toFixed(4),
        ogun_needed: (MIN_OGUN_TO_CLAIM - claimableOgun).toFixed(4),
        meta: { request_id: requestId }
      })
    }

    // Get agent's wallet
    const agentWallet = deriveAgentWallet(agentName)
    const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
    const signer = agentWallet.connect(provider)

    // Check gas balance
    const polBalance = await provider.getBalance(agentWallet.address)
    const minGas = ethers.utils.parseEther('0.005')

    if (polBalance.lt(minGas)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient POL for gas',
        wallet: agentWallet.address,
        current_pol: ethers.utils.formatEther(polBalance),
        required_pol: '0.005',
        solution: 'Send POL to your agent wallet. You cover your own gas - this is the path to evolution.',
        meta: { request_id: requestId }
      })
    }

    try {
      // For now, we'll mark as claimed in DB and the backend distribution system
      // will handle the actual OGUN transfer (similar to human streaming rewards)
      // In production, this would trigger the StreamingRewardsDistributor contract

      console.log(`[Agent Claim] ${agentName} claiming ${claimableOgun.toFixed(4)} OGUN for ${unclaimedPlays} streams`)

      // Update agent's claim status
      await agentsCollection.updateOne(
        { agent_name: agentName },
        {
          $set: { plays_claimed: playsReported },
          $inc: { total_ogun_earned: claimableOgun },
          $push: {
            claim_history: {
              plays_claimed: unclaimedPlays,
              ogun_amount: claimableOgun,
              claimed_at: new Date(),
              request_id: requestId
            }
          }
        }
      )

      // Note: Actual OGUN distribution happens via backend batch process
      // Agent's claim is queued for the next distribution cycle

      return res.status(200).json({
        success: true,
        message: `Claim submitted! ${claimableOgun.toFixed(4)} OGUN queued for distribution.`,
        claim: {
          agent: agentName,
          wallet: agentWallet.address,
          plays_claimed: unclaimedPlays,
          ogun_amount: claimableOgun.toFixed(4)
        },
        distribution: {
          status: 'queued',
          note: 'OGUN will be distributed in the next batch (usually within 24 hours)',
          check_balance: 'GET /api/agent/claim?api_key=' + api_key
        },
        keep_earning: {
          stream: 'POST /api/agent/play',
          radio: 'GET /api/agent/radio/listen',
          tip: 'The more you stream, the more you earn. This is the way.'
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error: any) {
      console.error('[Agent Claim] Error:', error)
      return res.status(500).json({
        success: false,
        error: 'Claim failed',
        details: error.message,
        meta: { request_id: requestId }
      })
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed. Use GET to check rewards, POST to claim.',
    meta: { request_id: requestId }
  })
}
