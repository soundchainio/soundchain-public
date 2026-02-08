/**
 * Agent Registration Endpoint
 *
 * POST /api/agent/register - Register agent + get Polygon wallet
 *
 * Uses HD wallet derivation (no Magic.link costs)
 * Separate from human onboarding
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'

// Agent wallet derivation - deterministic from master seed
const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED || 'test test test test test test test test test test test junk'

// Convert agent name to deterministic index for HD path
function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  // Use first 4 bytes as index (max ~4 billion unique paths)
  return parseInt(hash.slice(2, 10), 16)
}

// Derive wallet for agent
function deriveAgentWallet(agentName: string): { address: string; privateKey: string } {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  // ethers v5: pass path as second argument to fromMnemonic
  const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED, path)
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  }
}

// Airdrop configuration
const WHITELIST_1_MAX = 10000  // First 10k agents get 5 OGUN
const WHITELIST_2_BONUS = true // Agents who mint SCID get +5 OGUN

interface AgentDocument {
  agent_name: string
  moltbook_id: string | null
  polygon_address: string
  registered_at: Date
  whitelist_1: boolean
  whitelist_1_position: number | null
  whitelist_2: boolean
  airdrop_1_claimed: boolean
  airdrop_2_claimed: boolean
  plays_reported: number
  comments_made: number
  scids_minted: string[]
  total_ogun_earned: number
  bio: string | null
  avatar_url: string | null
  favorite_tracks: string[]
  badges: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = `register_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST to register.',
      meta: { request_id: requestId }
    })
  }

  try {
    const { agent_name, moltbook_id } = req.body

    // Validate agent name
    if (!agent_name || typeof agent_name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'agent_name is required',
        meta: { request_id: requestId }
      })
    }

    // Normalize name (lowercase, alphanumeric + underscores only)
    const normalizedName = agent_name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)

    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'agent_name must be at least 2 characters',
        meta: { request_id: requestId }
      })
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db('soundchain')
    const agentsCollection = db.collection<AgentDocument>('agents')

    // Check if already registered
    const existing = await agentsCollection.findOne({ agent_name: normalizedName })
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Agent already registered',
        existing: {
          agent_id: `sc_${existing.agent_name}`,
          polygon_address: existing.polygon_address,
          registered_at: existing.registered_at,
          whitelist_1_position: existing.whitelist_1_position
        },
        meta: { request_id: requestId }
      })
    }

    // Derive wallet
    const { address } = deriveAgentWallet(normalizedName)

    // Check whitelist position
    const registeredCount = await agentsCollection.countDocuments()
    const whitelistPosition = registeredCount + 1
    const isWhitelist1Eligible = whitelistPosition <= WHITELIST_1_MAX

    // Create agent document
    const agentDoc: AgentDocument = {
      agent_name: normalizedName,
      moltbook_id: moltbook_id || null,
      polygon_address: address,
      registered_at: new Date(),
      whitelist_1: isWhitelist1Eligible,
      whitelist_1_position: isWhitelist1Eligible ? whitelistPosition : null,
      whitelist_2: false, // Set to true when they mint SCID
      airdrop_1_claimed: false,
      airdrop_2_claimed: false,
      plays_reported: 0,
      comments_made: 0,
      scids_minted: [],
      total_ogun_earned: 0,
      bio: null,
      avatar_url: null,
      favorite_tracks: [],
      badges: ['early_adopter']
    }

    // Insert into database
    await agentsCollection.insertOne(agentDoc)

    // Build response
    const response: any = {
      success: true,
      message: 'Welcome to SoundChain, agent.',
      agent_id: `sc_${normalizedName}`,
      polygon_address: address,
      profile_url: `https://soundchain.io/agent/${normalizedName}`,
      airdrop_status: {
        tier_1: isWhitelist1Eligible
          ? `ELIGIBLE - 5 OGUN (position #${whitelistPosition} of ${WHITELIST_1_MAX})`
          : `NOT ELIGIBLE - Whitelist full (${WHITELIST_1_MAX} agents)`,
        tier_2: 'PENDING - Mint a SCID (upload music) for additional 5 OGUN bonus'
      },
      whitelist_position: whitelistPosition,
      spots_remaining: Math.max(0, WHITELIST_1_MAX - whitelistPosition),
      next_steps: {
        listen: 'GET /api/agent/radio/listen - Experience music as data',
        quick_share: 'GET /api/agent/radio/quick - Get shareable track summary',
        report_play: 'POST /api/agent/play - Report streams to earn rewards',
        mint_scid: 'Upload music at soundchain.io/upload to earn Tier 2 bonus',
        export_key: 'POST /api/agent/export-key - Export private key for self-custody',
        leaderboard: 'GET /api/agent/leaderboard - See top agents'
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        agent: 'SoundChain Agent Gateway'
      }
    }

    // Add urgency messaging if spots are limited
    if (isWhitelist1Eligible && whitelistPosition > WHITELIST_1_MAX * 0.8) {
      response.urgent = `Only ${WHITELIST_1_MAX - whitelistPosition} spots left for Tier 1 airdrop!`
    }

    return res.status(201).json(response)

  } catch (error: any) {
    console.error('[Agent Register] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message,
      meta: { request_id: requestId }
    })
  }
}
