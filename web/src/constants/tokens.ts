/**
 * SoundChain Supported Tokens
 * Single source of truth for all accepted payment tokens
 * Security: Validated at compile-time with TypeScript
 */

export const SUPPORTED_TOKENS = [
  'MATIC',
  'OGUN',
  'PENGU',
  'ETH',
  'USDC',
  'USDT',
  'SOL',
  'BNB',
  'DOGE',
  'BONK',
  'MEATEOR',
  'PEPE',
  'BASE',
  'XTZ',
  'AVAX',
  'SHIB',
  'XRP',
  'SUI',
  'HBAR',
  'LINK',
  'LTC',
  'ZETA',
  'BTC',
  'YZY',
] as const;

export type Token = typeof SUPPORTED_TOKENS[number];

/**
 * Security: Validates token against whitelist
 * @param token - Token symbol to validate
 * @returns true if token is supported
 */
export const isValidToken = (token: string): token is Token => {
  return SUPPORTED_TOKENS.includes(token as Token);
};

/**
 * Security: Filters array to only valid tokens
 * @param tokens - Array of token symbols
 * @returns Validated array with only supported tokens
 */
export const validateTokens = (tokens: string[]): Token[] => {
  return tokens.filter(isValidToken);
};

/**
 * Get display symbol for a token (e.g., 'MATIC' → 'POL')
 * Some tokens have been rebranded but we keep internal symbol for compatibility
 */
export const getDisplaySymbol = (token: Token): string => {
  return TOKEN_INFO[token]?.displaySymbol || token;
};

/**
 * Token display information
 */
/**
 * Token contract addresses on Polygon Mainnet
 * Single source of truth - use these instead of hardcoding addresses
 */
export const TOKEN_ADDRESSES = {
  MATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // Wrapped MATIC (legacy alias)
  WPOL: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',  // Wrapped POL (MATIC renamed to POL)
  OGUN: '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c',  // OGUN Token
} as const;

/**
 * QuickSwap Router for DEX swaps (Uniswap V2 compatible)
 */
export const QUICKSWAP_ROUTER = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';

/**
 * Swap configuration defaults
 */
export const SWAP_CONFIG = {
  DEFAULT_SLIPPAGE: 0.5,  // 0.5%
  MAX_SLIPPAGE: 5,        // 5%
  DEADLINE_MINUTES: 5,    // 5 minute deadline
} as const;

/**
 * QuickSwap DEX URLs for token swaps
 */
export const QUICKSWAP_SWAP_URL = (inputToken: string, outputToken: string) =>
  `https://quickswap.exchange/#/swap?currency0=${inputToken}&currency1=${outputToken}`;

export const TOKEN_INFO: Record<Token, { name: string; icon?: string; displaySymbol?: string }> = {
  MATIC: { name: 'Polygon', icon: '⬡', displaySymbol: 'POL' }, // MATIC rebranded to POL Sept 2024
  OGUN: { name: 'SoundChain Token', icon: '🔊' },
  PENGU: { name: 'Pudgy Penguins', icon: '🐧' },
  ETH: { name: 'Ethereum', icon: '🔷' },
  USDC: { name: 'USD Coin', icon: '💵' },
  USDT: { name: 'Tether', icon: '💲' },
  SOL: { name: 'Solana', icon: '◎' },
  BNB: { name: 'Binance Coin', icon: '🟡' },
  DOGE: { name: 'Dogecoin', icon: '🐕' },
  BONK: { name: 'Bonk', icon: '🦴' },
  MEATEOR: { name: 'Meateor', icon: '☄️' },
  PEPE: { name: 'Pepe', icon: '🐸' },
  BASE: { name: 'Base', icon: '🔵' },
  XTZ: { name: 'Tezos', icon: 'ꜩ' },
  AVAX: { name: 'Avalanche', icon: '🔺' },
  SHIB: { name: 'Shiba Inu', icon: '🐶' },
  XRP: { name: 'Ripple', icon: '✖️' },
  SUI: { name: 'Sui', icon: '💧' },
  HBAR: { name: 'Hedera', icon: 'ℏ' },
  LINK: { name: 'Chainlink', icon: '⛓️' },
  LTC: { name: 'Litecoin', icon: 'Ł' },
  ZETA: { name: 'ZetaChain', icon: 'ζ' },
  BTC: { name: 'Bitcoin', icon: '₿' },
  YZY: { name: 'Yeezy', icon: '👟' },
};
