/**
 * SoundChain L2 Contract Addresses
 * Deployed February 11, 2026 to Polygon Mainnet
 */

export const L2_CONTRACTS = {
  // Fee collection (0.05% on all transactions)
  FEE_COLLECTOR: '0xdC77ab8C727c0Db5F35D7423C4ce06c8A688AAC5',

  // Cross-chain NFT transfers
  NFT_BRIDGE: '0x94cA9622e37Ce9FC87f7C4d3460E647726DFFf82',

  // Post-mint royalty splits for collaborators
  ROYALTY_SPLITTER_FACTORY: '0x08f22F23Fb3cdd7c91fd85621cD99Ba4873e0A2c',

  // On-chain track identity registry
  SCID_REGISTRY: '0x823F90438f262A70D74c6D4e782677256f39150a',

  // Multi-token marketplace (24 tokens supported)
  MULTI_TOKEN_MARKETPLACE: '0xbd5B6A16809f5a67450CBa98Ee2C9ecF8E5ebF21',

  // Streaming rewards distributor (5M OGUN funded)
  STREAMING_REWARDS: '0xcf9416c49D525f7a50299c71f33606A158F28546',

  // Treasury (Gnosis Safe)
  TREASURY: '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b',

  // OGUN Token
  OGUN_TOKEN: '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c',
} as const;

export const SUPPORTED_BRIDGE_CHAINS = [
  { id: 1, name: 'Ethereum', icon: '🔷', symbol: 'ETH' },
  { id: 8453, name: 'Base', icon: '🔵', symbol: 'ETH' },
  { id: 42161, name: 'Arbitrum', icon: '🔶', symbol: 'ETH' },
  { id: 10, name: 'Optimism', icon: '🔴', symbol: 'ETH' },
  { id: 7000, name: 'ZetaChain', icon: 'ζ', symbol: 'ZETA' },
] as const;

export type BridgeChain = typeof SUPPORTED_BRIDGE_CHAINS[number];

/**
 * Platform fee rate: 0.05% (5 basis points)
 */
export const PLATFORM_FEE_RATE = 0.0005;

/**
 * Royalty splitter constraints
 */
export const ROYALTY_SPLITTER_CONFIG = {
  MAX_COLLABORATORS: 10,
  TIMELOCK_HOURS: 48,
  MIN_SPLIT_BPS: 100, // 1% minimum per collaborator
  MAX_SPLIT_BPS: 10000, // 100% total
} as const;
