/**
 * Omnichain Configuration for SoundChain
 * Supporting 23+ blockchain networks for true cross-chain NFT aggregation
 */

export interface ChainConfig {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  rpcUrl?: string;
  chainId?: number;
  explorer?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  enabled: boolean;
  category: 'layer1' | 'layer2' | 'omnichain' | 'specialized';
}

export const CHAINS: Record<string, ChainConfig> = {
  // Layer 1 Chains
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    displayName: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
    explorer: 'https://mempool.space',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    enabled: true,
    category: 'layer1',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    displayName: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    chainId: 1,
    rpcUrl: 'https://ethereum.publicnode.com',
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'layer1',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    displayName: 'Solana',
    icon: '◎',
    color: '#14F195',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://explorer.solana.com',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    enabled: true,
    category: 'layer1',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    displayName: 'Polygon',
    icon: '⬡',
    color: '#8247E5',
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    enabled: true,
    category: 'layer2',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    displayName: 'Avalanche',
    icon: '🔺',
    color: '#E84142',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    enabled: true,
    category: 'layer1',
  },

  // Layer 2 Solutions
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    displayName: 'Arbitrum',
    icon: '🔵',
    color: '#28A0F0',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'layer2',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    displayName: 'Optimism',
    icon: '🔴',
    color: '#FF0420',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'layer2',
  },
  base: {
    id: 'base',
    name: 'Base',
    displayName: 'Base',
    icon: '🔵',
    color: '#0052FF',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'layer2',
  },
  blast: {
    id: 'blast',
    name: 'Blast',
    displayName: 'Blast',
    icon: '💥',
    color: '#FCFC03',
    chainId: 81457,
    rpcUrl: 'https://rpc.blast.io',
    explorer: 'https://blastscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'layer2',
  },

  // Omnichain & Cross-Chain
  zetachain: {
    id: 'zetachain',
    name: 'ZetaChain',
    displayName: 'ZetaChain',
    icon: 'ζ',
    color: '#00D4AA',
    chainId: 7000,
    rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    explorer: 'https://explorer.zetachain.com',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    enabled: true,
    category: 'omnichain',
  },

  // Specialized Chains
  abstract: {
    id: 'abstract',
    name: 'Abstract',
    displayName: 'Abstract',
    icon: '⚛',
    color: '#00E5BE',
    enabled: true,
    category: 'specialized',
  },
  apechain: {
    id: 'apechain',
    name: 'ApeChain',
    displayName: 'ApeChain',
    icon: '🦍',
    color: '#0057FF',
    enabled: true,
    category: 'specialized',
  },
  b3: {
    id: 'b3',
    name: 'B3',
    displayName: 'B3',
    icon: '🅱',
    color: '#0066FF',
    enabled: true,
    category: 'specialized',
  },
  berachain: {
    id: 'berachain',
    name: 'Berachain',
    displayName: 'Berachain',
    icon: '🐻',
    color: '#E67E22',
    enabled: true,
    category: 'specialized',
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    displayName: 'Flow',
    icon: '🌊',
    color: '#00EF8B',
    enabled: true,
    category: 'specialized',
  },
  gunz: {
    id: 'gunz',
    name: 'GUNZ',
    displayName: 'GUNZ',
    icon: '🔫',
    color: '#1C1C1C',
    enabled: true,
    category: 'specialized',
  },
  hyperevm: {
    id: 'hyperevm',
    name: 'HyperEVM',
    displayName: 'HyperEVM',
    icon: '⚡',
    color: '#00D9FF',
    enabled: true,
    category: 'specialized',
  },
  ronin: {
    id: 'ronin',
    name: 'Ronin',
    displayName: 'Ronin',
    icon: '⚔',
    color: '#2368D1',
    chainId: 2020,
    rpcUrl: 'https://api.roninchain.com/rpc',
    explorer: 'https://explorer.roninchain.com',
    nativeCurrency: { name: 'RON', symbol: 'RON', decimals: 18 },
    enabled: true,
    category: 'specialized',
  },
  sei: {
    id: 'sei',
    name: 'Sei',
    displayName: 'Sei',
    icon: '🌀',
    color: '#C23C3C',
    enabled: true,
    category: 'specialized',
  },
  shape: {
    id: 'shape',
    name: 'Shape',
    displayName: 'Shape',
    icon: '⚪',
    color: '#FFFFFF',
    enabled: true,
    category: 'specialized',
  },
  somnia: {
    id: 'somnia',
    name: 'Somnia',
    displayName: 'Somnia',
    icon: '🌙',
    color: '#9B59B6',
    enabled: true,
    category: 'specialized',
  },
  soneium: {
    id: 'soneium',
    name: 'Soneium',
    displayName: 'Soneium',
    icon: '⭕',
    color: '#3498DB',
    enabled: true,
    category: 'specialized',
  },
  unichain: {
    id: 'unichain',
    name: 'Unichain',
    displayName: 'Unichain',
    icon: '🦄',
    color: '#FF007A',
    enabled: true,
    category: 'specialized',
  },
  zora: {
    id: 'zora',
    name: 'Zora',
    displayName: 'Zora',
    icon: '⚫',
    color: '#000000',
    chainId: 7777777,
    rpcUrl: 'https://rpc.zora.energy',
    explorer: 'https://explorer.zora.energy',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    enabled: true,
    category: 'specialized',
  },
};

export const ALL_CHAINS = Object.values(CHAINS);
export const ENABLED_CHAINS = ALL_CHAINS.filter(chain => chain.enabled);

export function getChainById(id: string): ChainConfig | undefined {
  return CHAINS[id];
}

export function getChainsByCategory(category: ChainConfig['category']): ChainConfig[] {
  return ALL_CHAINS.filter(chain => chain.category === category && chain.enabled);
}

export function getChainByContractAddress(contractAddress: string): ChainConfig | undefined {
  // Smart contract address pattern matching
  // This can be enhanced with actual contract registry lookup
  const address = contractAddress?.toLowerCase();

  if (!address) return undefined;

  // Polygon contracts (example - your actual contracts)
  if (address.startsWith('0x') && address.length === 42) {
    // Default to Polygon for now since that's where your 8,236 NFTs are
    return CHAINS.polygon;
  }

  // Solana addresses (base58, typically 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return CHAINS.solana;
  }

  return undefined;
}
