/**
 * @soundchain/contracts — On-chain addresses + minimal ABI snippets.
 *
 * Polygon mainnet (chainId 137) is the source of truth. All SoundChain
 * contracts deploy there; multi-chain expansion (ETH/Base/Arb/Op) is
 * read-only via direct RPC.
 *
 * Only ABI fragments actually used by client code live here. Full ABIs
 * are in `soundchain-contracts/artifacts/` and not bundled — keeps
 * shared package small.
 */

// ─── Addresses ────────────────────────────────────────────────────────────

export const POLYGON_CHAIN_ID = 137 as const

export const CONTRACTS = {
  /** OGUN ERC-20 token */
  OGUN: '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c',
  /** Soundchain721Editions — edition-aware NFT contract */
  NFT_EDITIONS: '0xf01D323bdAc88ee39543CbBc568C6Fc76258FfE0',
  /** SoundchainMarketplaceEditions — buy/sell with 7-token payment support */
  MARKETPLACE_EDITIONS: '0x7EfC9A7F3381A4B28a2113EA99E2d80832589239',
  /** SoundchainMarketplace V1 — legacy single-payment */
  MARKETPLACE_V1: '0x27302E3ff5287a5973d8D5328C4cEFCd752778f2',
  /** SoundchainAuction V2 */
  AUCTION_V2: '0x35f662bD7d418fd7B19518A22aF3D54ea99e7bf0',
  /** StakingRewards — OGUN single-asset stake */
  STAKING: '0xe6c3F86a250b5AAd762405ce5F579F81Fddc426a',
  /** LP Token (OGUN/POL) */
  LP_TOKEN: '0xfF0E141891D0E66b0D094215B44eF433F43066e5',
  /** LP Staking */
  LP_STAKING: '0x5748E147b5479A97904eFCC466dF4f7C6dbB83F9',
  /** Streaming Rewards distributor */
  STREAMING_REWARDS: '0xcf9416c49D525f7a50299c71f33606A158F28546',
  /** QuickSwap Router for POL ↔ OGUN swaps */
  QUICKSWAP_ROUTER: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  /** Treasury (Gnosis Safe) — receives 0.05% platform fees */
  TREASURY: '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b',
} as const

export type ContractName = keyof typeof CONTRACTS

// ─── Platform fee ─────────────────────────────────────────────────────────

/** 0.05% — applied to mint gas, marketplace sales, swaps, stake/unstake */
export const PLATFORM_FEE_BPS = 5
export const PLATFORM_FEE_DECIMAL = 0.0005

// ─── ABI fragments (only what client code uses) ───────────────────────────

export const NFT_EDITIONS_ABI = [
  {
    name: 'createEdition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'editionQuantity', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: '_royaltyPercentage', type: 'uint8' },
    ],
    outputs: [{ name: 'retEditionNumber', type: 'uint256' }],
  },
  {
    name: 'safeMintToEditionQuantity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: '_tokenURI', type: 'string' },
      { name: 'editionNumber', type: 'uint256' },
      { name: 'quantity', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const MARKETPLACE_ABI = [
  {
    name: 'listItem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_nftAddress', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_quantity', type: 'uint256' },
      { name: '_prices', type: 'uint256[7]' },
      { name: '_acceptedPayments', type: 'uint8' },
      { name: '_startingTime', type: 'uint256' },
      { name: '_chainId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'buyItem',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_nftAddress', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_owner', type: 'address' },
      { name: '_paymentType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'cancelListing',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_nftAddress', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

// ─── Payment types (for marketplace buyItem _paymentType param) ───────────

export enum PaymentType {
  POL = 0,
  OGUN = 1,
  USDC = 2,
  USDT = 3,
  ETH = 4,
  LINK = 5,
  AVAX = 6,
}
