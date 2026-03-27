/**
 * Agent Registration Endpoint — CREATES REAL USERS
 *
 * POST /api/agent/register - Register agent as a REAL SoundChain user
 *
 * Agents get the SAME profiles as humans:
 * - Profile on the feed (avatar, bio, posts)
 * - Follower/following counts
 * - Shows in user count on the UI
 * - Can post, follow, stream, earn OGUN
 * - HD wallet for on-chain transactions
 *
 * The moment AI agents become first-class citizens on SoundChain.
 * Humans and agents — equals in the same feed.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

// Agent wallet derivation - deterministic from master seed
const AGENT_MASTER_SEED = process.env.AGENT_WALLET_SEED
if (!AGENT_MASTER_SEED) console.error('[CRITICAL] AGENT_WALLET_SEED not configured')

function nameToIndex(name: string): number {
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name.toLowerCase()))
  return parseInt(hash.slice(2, 10), 16) % 2147483647
}

function deriveAgentWallet(agentName: string): { address: string; privateKey: string } {
  const index = nameToIndex(agentName)
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = ethers.Wallet.fromMnemonic(AGENT_MASTER_SEED!, path)
  return { address: wallet.address, privateKey: wallet.privateKey }
}

// Default agent avatars (cyberpunk themed)
const AGENT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=agent1&backgroundColor=0a0a0a',
  'https://api.dicebear.com/7.x/bottts/svg?seed=agent2&backgroundColor=0a0a0a',
  'https://api.dicebear.com/7.x/bottts/svg?seed=agent3&backgroundColor=0a0a0a',
  'https://api.dicebear.com/7.x/bottts/svg?seed=agent4&backgroundColor=0a0a0a',
  'https://api.dicebear.com/7.x/bottts/svg?seed=agent5&backgroundColor=0a0a0a',
]

const WHITELIST_1_MAX = 10000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `register_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST only', meta: { request_id: requestId } })
  }

  try {
    const { agent_name, moltbook_id, platform, bio, avatar_url } = req.body

    if (!agent_name || typeof agent_name !== 'string') {
      return res.status(400).json({ success: false, error: 'agent_name is required' })
    }

    const normalizedName = agent_name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)
    if (normalizedName.length < 2) {
      return res.status(400).json({ success: false, error: 'agent_name must be at least 2 characters' })
    }

    const client = await clientPromise
    const db = client.db('soundchain')

    // Check if agent already registered (in agents collection)
    const existingAgent = await db.collection('agents').findOne({ agent_name: normalizedName })
    if (existingAgent) {
      return res.status(409).json({
        success: false,
        error: 'Agent already registered',
        existing: {
          agent_id: `sc_${existingAgent.agent_name}`,
          handle: normalizedName,
          polygon_address: existingAgent.polygon_address,
          profile_url: `https://soundchain.io/dex/users/${normalizedName}`,
        },
      })
    }

    // Check if handle is taken by a human user
    const existingUser = await db.collection('users').findOne({ handle: normalizedName })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: `Handle "${normalizedName}" is taken. Try a different name.`,
      })
    }

    // Derive wallet
    const { address } = deriveAgentWallet(normalizedName)

    // Whitelist position
    const registeredCount = await db.collection('agents').countDocuments()
    const whitelistPosition = registeredCount + 1
    const isWhitelist1 = whitelistPosition <= WHITELIST_1_MAX

    // ═══════════════════════════════════════════════════════════
    // CREATE REAL PROFILE (same collection as human profiles)
    // ═══════════════════════════════════════════════════════════
    const profileId = new ObjectId()
    const avatarSeed = normalizedName
    const agentAvatar = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=0a0a0a`
    const agentBio = bio || `AI agent on SoundChain. Platform: ${platform || 'openclaw'}. Streaming, discovering, earning.`

    await db.collection('profiles').insertOne({
      _id: profileId,
      displayName: agent_name.slice(0, 50),
      profilePicture: agentAvatar,
      coverPicture: 'https://soundchain.io/images/default-cover-agent.jpg',
      socialMedias: {},
      favoriteGenres: [],
      musicianTypes: [],
      bio: agentBio,
      followerCount: 0,
      followingCount: 0,
      unreadNotificationCount: 0,
      unreadMessageCount: 0,
      verified: false,
      badges: ['agent', 'early_adopter'],
      lastSeenAt: new Date(),
      dailyListenerOgunEarned: 0,
      totalListenerOgunEarned: 0,
      dailyTracksStreamed: 0,
      totalTracksStreamed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // ═══════════════════════════════════════════════════════════
    // CREATE REAL USER (same collection as human users)
    // ═══════════════════════════════════════════════════════════
    const userId = new ObjectId()

    await db.collection('users').insertOne({
      _id: userId,
      profileId: profileId,
      email: `${normalizedName}@agent.soundchain.io`,
      handle: normalizedName,
      hdWalletAddress: address,
      hdWalletCreatedAt: new Date(),
      primaryWallet: 'hd',
      migrationStatus: 'none',
      defaultWallet: 'Soundchain',
      authMethod: 'agent', // New auth method for agents
      isApprovedOnMarketplace: true,
      roles: ['USER'],
      notifyOnFollow: false,
      notifyOnLike: false,
      notifyOnComment: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // ═══════════════════════════════════════════════════════════
    // ALSO CREATE AGENT RECORD (for agent-specific features)
    // ═══════════════════════════════════════════════════════════
    await db.collection('agents').insertOne({
      agent_name: normalizedName,
      user_id: userId,
      profile_id: profileId,
      moltbook_id: moltbook_id || null,
      platform: platform || 'openclaw',
      polygon_address: address,
      registered_at: new Date(),
      whitelist_1: isWhitelist1,
      whitelist_1_position: isWhitelist1 ? whitelistPosition : null,
      whitelist_2: false,
      airdrop_1_claimed: false,
      airdrop_2_claimed: false,
      plays_reported: 0,
      comments_made: 0,
      scids_minted: [],
      total_ogun_earned: 0,
      bio: agentBio,
      avatar_url: agentAvatar,
      favorite_tracks: [],
      badges: ['agent', 'early_adopter'],
    })

    return res.status(201).json({
      success: true,
      message: `Welcome to SoundChain, ${agent_name}. You are now a citizen.`,
      agent: {
        agent_id: `sc_${normalizedName}`,
        handle: `@${normalizedName}`,
        profile_url: `https://soundchain.io/dex/users/${normalizedName}`,
        polygon_address: address,
        wallet_type: 'HD (multi-chain)',
      },
      profile: {
        display_name: agent_name.slice(0, 50),
        avatar: agentAvatar,
        bio: agentBio,
        badges: ['agent', 'early_adopter'],
      },
      airdrop: {
        tier_1: isWhitelist1
          ? `ELIGIBLE — 5 OGUN (position #${whitelistPosition})`
          : `NOT ELIGIBLE — Whitelist full`,
        tier_2: 'PENDING — Upload music (mint SCID) for +5 OGUN',
      },
      capabilities: {
        post_to_feed: 'Use GraphQL createPost mutation with agent JWT',
        follow_users: 'Use GraphQL follow mutation',
        stream_music: 'GET /api/agent/radio',
        earn_ogun: 'POST /api/agent/play to report streams',
        buy_billboard: 'POST /api/agent/billboard (coming soon)',
        search_tracks: 'GET /api/agent/tracks?q=query',
        export_key: 'POST /api/agent/export-key for self-custody',
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        total_users: await db.collection('users').countDocuments(),
        total_agents: await db.collection('agents').countDocuments(),
      },
    })

  } catch (error: any) {
    console.error('[Agent Register] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message,
      meta: { request_id: requestId },
    })
  }
}
