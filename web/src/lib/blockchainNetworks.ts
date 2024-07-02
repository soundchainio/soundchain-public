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
  rpc: 'https://polygon-rpc.com/',
  id: 137,
  idHex: '0x89',
  symbol: 'MATIC',
  blockExplorer: 'https://polygonscan.com/',
}

export const testnetNetwork: BlockchainNetwork = {
  name: 'Mumbai Testnet',
  rpc: 'https://matic-mumbai.chainstacklabs.com',
  // alternative testnet rpc
  // rpc: 'https://rpc-mumbai.maticvigil.com',
  // rpc: 'https://rpc-mumbai.matic.today',
  // rpc: 'https://matic-testnet-archive-rpc.bwarelabs.com',
  // rpc: 'https://polygon-mumbai.g.alchemy.com/v2/XmmFmbucl8MhC85TAsWgv6I4DcS2-VYL',
  // rpc: 'https://rpc-mumbai.maticvigil.com',
  id: 80001,
  idHex: '0x13881',
  symbol: 'MATIC',
  blockExplorer: 'https://mumbai.polygonscan.com',
}

export const network: BlockchainNetwork =
  process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' ? testnetNetwork : mainNetwork

export const isMainNetwork = network.id === mainNetwork.id
