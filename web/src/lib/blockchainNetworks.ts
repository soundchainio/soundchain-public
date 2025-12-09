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
  rpc: 'https://polygon-rpc.com',  // Official Polygon RPC
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

export const network: BlockchainNetwork =
  process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' ? testnetNetwork : mainNetwork

export const isMainNetwork = network.id === mainNetwork.id
