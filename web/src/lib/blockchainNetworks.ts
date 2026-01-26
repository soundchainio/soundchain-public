export interface BlockchainNetwork {
  name: string
  rpc: string
  id: number
  idHex: string
  symbol: string
  blockExplorer: string
  icon?: string
  color?: string
}

export const mainNetwork: BlockchainNetwork = {
  name: 'Polygon Mainnet',
  // Use Alchemy RPC for better rate limits
  rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/hjUDQMyFJcZP2cTLKW2iy',
  id: 137,
  idHex: '0x89',
  symbol: 'POL',
  blockExplorer: 'https://polygonscan.com/',
  icon: '🟣',
  color: '#8247E5',
}

export const testnetNetwork: BlockchainNetwork = {
  name: 'Polygon Amoy Testnet',
  rpc: 'https://rpc-amoy.polygon.technology',
  id: 80002,
  idHex: '0x13882',
  symbol: 'POL',
  blockExplorer: 'https://www.oklink.com/amoy',
  icon: '🟣',
  color: '#8247E5',
}

// Multi-chain EVM networks
// Note: EVM addresses are identical across all chains - we just switch RPC endpoints

export const ethereumNetwork: BlockchainNetwork = {
  name: 'Ethereum',
  rpc: process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://eth.llamarpc.com',
  id: 1,
  idHex: '0x1',
  symbol: 'ETH',
  blockExplorer: 'https://etherscan.io/',
  icon: '🔷',
  color: '#627EEA',
}

export const baseNetwork: BlockchainNetwork = {
  name: 'Base',
  rpc: process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
  id: 8453,
  idHex: '0x2105',
  symbol: 'ETH',
  blockExplorer: 'https://basescan.org/',
  icon: '🔵',
  color: '#0052FF',
}

export const arbitrumNetwork: BlockchainNetwork = {
  name: 'Arbitrum',
  rpc: process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
  id: 42161,
  idHex: '0xa4b1',
  symbol: 'ETH',
  blockExplorer: 'https://arbiscan.io/',
  icon: '🔶',
  color: '#28A0F0',
}

export const optimismNetwork: BlockchainNetwork = {
  name: 'Optimism',
  rpc: process.env.NEXT_PUBLIC_OPTIMISM_RPC || 'https://mainnet.optimism.io',
  id: 10,
  idHex: '0xa',
  symbol: 'ETH',
  blockExplorer: 'https://optimistic.etherscan.io/',
  icon: '🔴',
  color: '#FF0420',
}

// Map of all supported EVM networks by chain ID
export const SUPPORTED_NETWORKS: Record<number, BlockchainNetwork> = {
  137: mainNetwork,
  1: ethereumNetwork,
  8453: baseNetwork,
  42161: arbitrumNetwork,
  10: optimismNetwork,
  80002: testnetNetwork,
}

// Helper to get network by chain ID
export const getNetworkByChainId = (chainId: number): BlockchainNetwork | undefined => {
  return SUPPORTED_NETWORKS[chainId]
}

// Get all mainnet networks (exclude testnets)
export const getMainnetNetworks = (): BlockchainNetwork[] => {
  return [mainNetwork, ethereumNetwork, baseNetwork, arbitrumNetwork, optimismNetwork]
}

// Check if OGUN is available on a chain (only Polygon)
export const isOgunAvailable = (chainId: number): boolean => {
  return chainId === 137
}

// Use mainnet by default for production
// NEXT_PUBLIC_VERCEL_ENV is not automatically set by Vercel, so we check multiple indicators
const isProduction =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  process.env.NODE_ENV === 'production' ||
  (typeof window !== 'undefined' && (
    window.location.hostname === 'soundchain.fm' ||
    window.location.hostname === 'www.soundchain.fm' ||
    window.location.hostname === 'soundchain.io' ||
    window.location.hostname === 'www.soundchain.io'
  ))

export const network: BlockchainNetwork = isProduction ? mainNetwork : testnetNetwork

export const isMainNetwork = network.id === mainNetwork.id
