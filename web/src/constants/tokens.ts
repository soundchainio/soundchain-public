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
 * Token display information
 */
export const TOKEN_INFO: Record<Token, { name: string; icon?: string }> = {
  MATIC: { name: 'Polygon', icon: '⬡' },
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
