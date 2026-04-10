/**
 * Managed Agents — Custom Tool Definitions
 *
 * These tools let managed agents interact with SoundChain's domain:
 * - MongoDB queries (users, tracks, agents, royalties)
 * - OGUN contract reads (balances, staking, rewards)
 * - IPFS operations (pin status, CID lookups)
 * - Radio/feed queries (now playing, trending)
 *
 * Each tool returns structured data the agent can reason about.
 * Anthropic runs the agent loop — we only handle custom tool calls.
 *
 * Zero booleans.
 */

import type { CustomToolDefinition } from './types'

// ─── SoundChain Query Tool ──────────────────────────────────────

export const TOOL_SOUNDCHAIN_QUERY: CustomToolDefinition = {
  type: 'custom',
  name: 'soundchain_query',
  description:
    'Query SoundChain MongoDB for users, tracks, playlists, agents, royalties, or feed posts. ' +
    'Returns matching documents with pagination. Use for discovering content, checking user profiles, ' +
    'verifying agent registrations, and exploring the platform data.',
  input_schema: {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        enum: ['users', 'profiles', 'tracks', 'playlists', 'agents', 'posts', 'stories', 'scids', 'activities'],
        description: 'MongoDB collection to query',
      },
      filter: {
        type: 'object',
        description: 'MongoDB filter document (e.g. {"handle": "furl"} or {"badges": {"$in": ["agent"]}})',
      },
      projection: {
        type: 'object',
        description: 'Fields to include/exclude (e.g. {"handle": 1, "hdWalletAddress": 1})',
      },
      sort: {
        type: 'object',
        description: 'Sort order (e.g. {"createdAt": -1} for newest first)',
      },
      limit: {
        type: 'number',
        description: 'Max documents to return (default 10, max 50)',
      },
    },
    required: ['collection', 'filter'],
  },
}

// ─── OGUN Contract Read Tool ─────────────────────────────────────

export const TOOL_OGUN_CONTRACT: CustomToolDefinition = {
  type: 'custom',
  name: 'ogun_contract_read',
  description:
    'Execute read-only calls on SoundChain smart contracts on Polygon mainnet. ' +
    'Supports OGUN token (balanceOf, totalSupply, allowance), Staking (earned, balanceOf, rewardRate), ' +
    'StreamingRewards (claimable, totalDistributed), and NFT Editions (ownerOf, editionInfo, royaltyInfo). ' +
    'All calls are free (no gas). Returns on-chain data.',
  input_schema: {
    type: 'object',
    properties: {
      contract: {
        type: 'string',
        enum: ['ogun', 'staking', 'streaming_rewards', 'nft_editions', 'marketplace'],
        description: 'Which contract to call',
      },
      method: {
        type: 'string',
        description: 'Contract method name (e.g. "balanceOf", "earned", "totalSupply")',
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Method arguments as strings (addresses, amounts, etc.)',
      },
    },
    required: ['contract', 'method'],
  },
}

// ─── IPFS / Pinata Tool ─────────────────────────────────────────

export const TOOL_IPFS: CustomToolDefinition = {
  type: 'custom',
  name: 'ipfs_query',
  description:
    'Check IPFS pin status, resolve CIDs, or get pinned content metadata via Pinata. ' +
    'Use for verifying audio/artwork availability, checking pin health, or resolving track CIDs.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'metadata', 'resolve'],
        description: 'status: check pin status, metadata: get pin metadata, resolve: get gateway URL',
      },
      cid: {
        type: 'string',
        description: 'IPFS CID (content identifier) to query',
      },
    },
    required: ['action', 'cid'],
  },
}

// ─── Radio / Now Playing Tool ────────────────────────────────────

export const TOOL_RADIO: CustomToolDefinition = {
  type: 'custom',
  name: 'radio_now_playing',
  description:
    'Get the current OGUN Radio state — now playing track, queue, listener count, recent plays. ' +
    'Radio broadcasts 618+ NFT tracks on rotation. Use for real-time platform activity.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['now_playing', 'queue', 'recent', 'stats'],
        description: 'What radio data to fetch',
      },
    },
    required: ['action'],
  },
}

// ─── Platform Stats Tool ─────────────────────────────────────────

export const TOOL_PLATFORM_STATS: CustomToolDefinition = {
  type: 'custom',
  name: 'platform_stats',
  description:
    'Get real-time SoundChain platform statistics — total users, tracks, agents, streams, ' +
    'OGUN supply, staking TVL, marketplace volume. Use for reporting and dashboards.',
  input_schema: {
    type: 'object',
    properties: {
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['users', 'tracks', 'agents', 'streams', 'ogun_supply', 'staking_tvl', 'nft_volume'],
        },
        description: 'Which metrics to fetch (omit for all)',
      },
    },
  },
}

// ─── Feed Post Tool ──────────────────────────────────────────────

export const TOOL_FEED_POST: CustomToolDefinition = {
  type: 'custom',
  name: 'feed_post',
  description:
    'Create a post on SoundChain feed as this agent. Posts appear in the global feed alongside ' +
    'human posts. Requires agent JWT auth. Supports text, links, and embedded media.',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Post text content (max 2000 chars)',
      },
      linkUrl: {
        type: 'string',
        description: 'Optional URL to embed (YouTube, Spotify, SoundCloud, etc.)',
      },
    },
    required: ['message'],
  },
}

// ─── All Custom Tools ────────────────────────────────────────────

export const ALL_CUSTOM_TOOLS: CustomToolDefinition[] = [
  TOOL_SOUNDCHAIN_QUERY,
  TOOL_OGUN_CONTRACT,
  TOOL_IPFS,
  TOOL_RADIO,
  TOOL_PLATFORM_STATS,
  TOOL_FEED_POST,
]

// Per-agent tool assignments
export const TOOLS_BY_ROLE = {
  ORCHESTRATOR: ALL_CUSTOM_TOOLS,
  FEATURE: [TOOL_SOUNDCHAIN_QUERY, TOOL_PLATFORM_STATS, TOOL_RADIO],
  UTILITY: [TOOL_SOUNDCHAIN_QUERY, TOOL_OGUN_CONTRACT, TOOL_IPFS],
  SOCIAL: [TOOL_SOUNDCHAIN_QUERY, TOOL_FEED_POST, TOOL_PLATFORM_STATS, TOOL_RADIO],
} as const
