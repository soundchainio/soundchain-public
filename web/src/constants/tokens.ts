/**
 * SoundChain Supported Tokens
 * Single source of truth for all accepted payment tokens
 * Security: Validated at compile-time with TypeScript
 */

export const SUPPORTED_TOKENS = [
  'MATIC',
  'OGUN',
  'ETH',
  'USDC',
  'USDT',
  'SOL',
  'BNB',
  'DOGE',
  'BONK',
  'MEATIOR',
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
  MATIC: { name: 'Polygon' },
  OGUN: { name: 'SoundChain Token' },
  ETH: { name: 'Ethereum' },
  USDC: { name: 'USD Coin' },
  USDT: { name: 'Tether' },
  SOL: { name: 'Solana' },
  BNB: { name: 'Binance Coin' },
  DOGE: { name: 'Dogecoin' },
  BONK: { name: 'Bonk' },
  MEATIOR: { name: 'Meatior' },
  PEPE: { name: 'Pepe' },
  BASE: { name: 'Base' },
  XTZ: { name: 'Tezos' },
  AVAX: { name: 'Avalanche' },
  SHIB: { name: 'Shiba Inu' },
  XRP: { name: 'Ripple' },
  SUI: { name: 'Sui' },
  HBAR: { name: 'Hedera' },
  LINK: { name: 'Chainlink' },
  LTC: { name: 'Litecoin' },
  ZETA: { name: 'ZetaChain' },
  BTC: { name: 'Bitcoin' },
  YZY: { name: 'Yeezy' },
};
