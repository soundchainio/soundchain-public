interface BlockchainNetwork {
  name: string;
  api: string;
}

export const mainNetwork: BlockchainNetwork = {
  name: 'Polygon Mainnet',
  api: 'https://api.polygonscan.com/api',
};

export const testnetNetwork: BlockchainNetwork = {
  name: 'Matic Mumbai',
  api: 'https://api-testnet.polygonscan.com/api',
};

export const network: BlockchainNetwork = process.env.NODE_ENV !== 'production' ? testnetNetwork : mainNetwork;
