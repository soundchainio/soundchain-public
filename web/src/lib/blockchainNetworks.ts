interface BlockchainNetwork {
  name: string
  rpc: string
  id: number
  idHex: string
  symbol: string
  blockExplorer: string
}

export const mainNetwork: BlockchainNetwork = {
  name: 'Polygon Mainnet',
  // Use Ankr's free RPC - much higher rate limits than polygon-rpc.com
  rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://rpc.ankr.com/polygon',
  id: 137,
  idHex: '0x89',
  symbol: 'POL',
  blockExplorer: 'https://polygonscan.com/',
}

export const testnetNetwork: BlockchainNetwork = {
  name: 'Polygon Amoy Testnet',
  rpc: 'https://rpc-amoy.polygon.technology',
  id: 80002,
  idHex: '0x13882',
  symbol: 'POL',
  blockExplorer: 'https://www.oklink.com/amoy',
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
