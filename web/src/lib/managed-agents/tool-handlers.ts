/**
 * Managed Agents — Custom Tool Handlers
 *
 * When Anthropic's managed agent calls a custom tool, the session pauses
 * and sends us a `requires_action` event. We execute the tool here and
 * send the result back so the agent can continue its loop.
 *
 * Each handler connects to SoundChain's real infrastructure:
 * - MongoDB Atlas for data queries
 * - Polygon RPC for on-chain reads
 * - Pinata API for IPFS operations
 *
 * Zero booleans.
 */

import clientPromise from 'lib/mongodb'
import { ethers } from 'ethers'
import type { CustomToolResult } from './types'

// ─── Polygon RPC (direct, no Magic) ─────────────────────────────

const POLYGON_RPC = process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon.llamarpc.com'

// Contract addresses (from config)
const CONTRACTS = {
  ogun: process.env.NEXT_PUBLIC_OGUN_ADRESS || '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c',
  staking: '0xe6c3F86a250b5AAd762405ce5F579F81Fddc426a',
  streaming_rewards: '0x8456bfa1c4063dF31eC457d77a97c807E9827083',
  nft_editions: '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0',
  marketplace: '0x7EfC9A7F3381A4B28a2113EA99E2d80832589239',
} as const

// Minimal ABIs for read-only calls
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

const STAKING_ABI = [
  'function earned(address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function rewardRate() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
]

const REWARDS_ABI = [
  'function totalDistributed() view returns (uint256)',
  'function isAuthorizedDistributor(address) view returns (bool)',
]

// ─── Tool Router ─────────────────────────────────────────────────

export async function handleCustomTool(
  toolName: string,
  input: Record<string, unknown>,
): Promise<CustomToolResult> {
  try {
    switch (toolName) {
      case 'soundchain_query':
        return await handleSoundchainQuery(input)
      case 'ogun_contract_read':
        return await handleOgunContract(input)
      case 'ipfs_query':
        return await handleIpfsQuery(input)
      case 'radio_now_playing':
        return await handleRadio(input)
      case 'platform_stats':
        return await handlePlatformStats(input)
      case 'feed_post':
        return await handleFeedPost(input)
      default:
        return { success: 'NO', data: null, error: `Unknown tool: ${toolName}` }
    }
  } catch (err: any) {
    return { success: 'NO', data: null, error: err.message || 'Tool execution failed' }
  }
}

// ─── MongoDB Query Handler ───────────────────────────────────────

async function handleSoundchainQuery(input: Record<string, unknown>): Promise<CustomToolResult> {
  const collection = input.collection as string
  const filter = (input.filter as Record<string, unknown>) || {}
  const projection = (input.projection as Record<string, unknown>) || {}
  const sort = (input.sort as Record<string, unknown>) || { createdAt: -1 }
  const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 50)

  // Allowlist of queryable collections
  const ALLOWED = ['users', 'profiles', 'tracks', 'playlists', 'agents', 'posts', 'stories', 'scids', 'activities']
  if (!ALLOWED.includes(collection)) {
    return { success: 'NO', data: null, error: `Collection "${collection}" not allowed` }
  }

  // Block dangerous operators
  const filterStr = JSON.stringify(filter)
  if (filterStr.includes('$where') || filterStr.includes('$function')) {
    return { success: 'NO', data: null, error: 'Operator not allowed' }
  }

  const client = await clientPromise
  const db = client.db('soundchain')

  const docs = await db
    .collection(collection)
    .find(filter)
    .project({ ...projection, _id: 0 }) // Never expose raw ObjectIds
    .sort(sort as any)
    .limit(limit)
    .toArray()

  const count = await db.collection(collection).countDocuments(filter)

  return {
    success: 'YES',
    data: {
      collection,
      count,
      returned: docs.length,
      documents: docs,
    },
  }
}

// ─── OGUN Contract Handler ───────────────────────────────────────

async function handleOgunContract(input: Record<string, unknown>): Promise<CustomToolResult> {
  const contractName = input.contract as string
  const method = input.method as string
  const args = (input.args as string[]) || []

  const address = CONTRACTS[contractName as keyof typeof CONTRACTS]
  if (!address) {
    return { success: 'NO', data: null, error: `Unknown contract: ${contractName}` }
  }

  const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)

  let abi: string[]
  switch (contractName) {
    case 'ogun':
      abi = ERC20_ABI
      break
    case 'staking':
      abi = STAKING_ABI
      break
    case 'streaming_rewards':
      abi = REWARDS_ABI
      break
    default:
      abi = ERC20_ABI // Fallback
  }

  const contract = new ethers.Contract(address, abi, provider)

  if (typeof contract[method] !== 'function') {
    return { success: 'NO', data: null, error: `Method "${method}" not found on ${contractName}` }
  }

  const result = await contract[method](...args)

  // Format BigNumber results to human-readable
  let formatted: string
  if (ethers.BigNumber.isBigNumber(result)) {
    formatted = ethers.utils.formatUnits(result, 18) // OGUN has 18 decimals
  } else {
    formatted = String(result)
  }

  return {
    success: 'YES',
    data: {
      contract: contractName,
      address,
      method,
      args,
      result: formatted,
      raw: String(result),
    },
  }
}

// ─── IPFS Query Handler ──────────────────────────────────────────

async function handleIpfsQuery(input: Record<string, unknown>): Promise<CustomToolResult> {
  const action = input.action as string
  const cid = input.cid as string

  if (!cid) {
    return { success: 'NO', data: null, error: 'CID is required' }
  }

  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://soundchain.mypinata.cloud/ipfs/'

  switch (action) {
    case 'resolve': {
      const url = `${gateway}${cid}`
      return { success: 'YES', data: { cid, gatewayUrl: url } }
    }

    case 'status':
    case 'metadata': {
      const pinataKey = process.env.PINATA_API_KEY
      const pinataSecret = process.env.PINATA_SECRET
      if (!pinataKey || !pinataSecret) {
        return { success: 'NO', data: null, error: 'Pinata credentials not configured' }
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const resp = await fetch(`https://api.pinata.cloud/data/pinList?hashContains=${cid}&status=pinned`, {
          headers: {
            pinata_api_key: pinataKey,
            pinata_secret_api_key: pinataSecret,
          },
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!resp.ok) {
          return { success: 'NO', data: null, error: `Pinata API error: ${resp.status}` }
        }

        const data = await resp.json()
        const pin = data.rows?.[0]

        if (!pin) {
          return { success: 'YES', data: { cid, pinned: 'NO', message: 'CID not found in pin list' } }
        }

        return {
          success: 'YES',
          data: {
            cid,
            pinned: 'YES',
            size: pin.size,
            dateUnpinned: pin.date_unpinned || 'STILL_PINNED',
            metadata: pin.metadata,
          },
        }
      } catch {
        clearTimeout(timeout)
        return { success: 'NO', data: null, error: 'Pinata request failed' }
      }
    }

    default:
      return { success: 'NO', data: null, error: `Unknown action: ${action}` }
  }
}

// ─── Radio Handler ───────────────────────────────────────────────

async function handleRadio(input: Record<string, unknown>): Promise<CustomToolResult> {
  const action = input.action as string
  const client = await clientPromise
  const db = client.db('soundchain')

  switch (action) {
    case 'now_playing':
    case 'stats': {
      const trackCount = await db.collection('tracks').countDocuments()
      const agentCount = await db.collection('agents').countDocuments()

      // Get a sample of recent tracks for "now playing" simulation
      const recentTracks = await db
        .collection('tracks')
        .find({})
        .project({ _id: 0, title: 1, artistName: 1, genre: 1, ipfsAudioUrl: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()

      return {
        success: 'YES',
        data: {
          totalTracks: trackCount,
          totalAgents: agentCount,
          recentTracks,
          status: 'BROADCASTING',
        },
      }
    }

    case 'queue':
    case 'recent': {
      const tracks = await db
        .collection('tracks')
        .find({})
        .project({ _id: 0, title: 1, artistName: 1, genre: 1, streamCount: 1 })
        .sort({ streamCount: -1 })
        .limit(20)
        .toArray()

      return { success: 'YES', data: { tracks, count: tracks.length } }
    }

    default:
      return { success: 'NO', data: null, error: `Unknown radio action: ${action}` }
  }
}

// ─── Platform Stats Handler ──────────────────────────────────────

async function handlePlatformStats(input: Record<string, unknown>): Promise<CustomToolResult> {
  const metrics = input.metrics as string[] | undefined
  const client = await clientPromise
  const db = client.db('soundchain')

  const stats: Record<string, unknown> = {}

  const all = !metrics || metrics.length === 0

  if (all || metrics?.includes('users')) {
    stats.totalUsers = await db.collection('users').countDocuments()
  }
  if (all || metrics?.includes('tracks')) {
    stats.totalTracks = await db.collection('tracks').countDocuments()
  }
  if (all || metrics?.includes('agents')) {
    stats.totalAgents = await db.collection('agents').countDocuments()
  }
  if (all || metrics?.includes('streams')) {
    // Aggregate total streams from SCids
    const streamAgg = await db
      .collection('scids')
      .aggregate([{ $group: { _id: null, total: { $sum: '$streamCount' } } }])
      .toArray()
    stats.totalStreams = streamAgg[0]?.total || 0
  }

  // On-chain metrics (if requested)
  if (all || metrics?.includes('ogun_supply')) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
      const ogun = new ethers.Contract(CONTRACTS.ogun, ERC20_ABI, provider)
      const supply = await ogun.totalSupply()
      stats.ogunTotalSupply = ethers.utils.formatUnits(supply, 18)
    } catch {
      stats.ogunTotalSupply = 'FETCH_ERROR'
    }
  }

  if (all || metrics?.includes('staking_tvl')) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC)
      const staking = new ethers.Contract(CONTRACTS.staking, STAKING_ABI, provider)
      const tvl = await staking.totalSupply()
      stats.stakingTVL = ethers.utils.formatUnits(tvl, 18)
    } catch {
      stats.stakingTVL = 'FETCH_ERROR'
    }
  }

  return { success: 'YES', data: stats }
}

// ─── Feed Post Handler ───────────────────────────────────────────

async function handleFeedPost(input: Record<string, unknown>): Promise<CustomToolResult> {
  const message = input.message as string
  const linkUrl = input.linkUrl as string | undefined

  if (!message || message.length > 2000) {
    return { success: 'NO', data: null, error: 'Message required, max 2000 chars' }
  }

  // Store as agent blog post (no auth required for agent posts)
  const client = await clientPromise
  const db = client.db('soundchain')

  const post = {
    message,
    linkUrl: linkUrl || null,
    source: 'MANAGED_AGENT',
    createdAt: new Date(),
  }

  const result = await db.collection('agent_posts').insertOne(post)

  return {
    success: 'YES',
    data: {
      postId: result.insertedId.toString(),
      message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      posted: 'YES',
    },
  }
}
