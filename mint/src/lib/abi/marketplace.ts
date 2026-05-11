/**
 * SoundchainMarketplaceEditions — minimal ABI for list/buy/cancel.
 *
 * `_prices` is a fixed-length [7] array indexed by PaymentType enum:
 *   0 = MATIC (native POL)
 *   1 = OGUN
 *   2 = USDC
 *   3 = USDT
 *   4 = WETH
 *   5 = LINK
 *   6 = AVAX
 */

export const marketplaceAbi = [
  {
    inputs: [
      { internalType: 'address', name: '_nftAddress', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'uint256', name: '_quantity', type: 'uint256' },
      { internalType: 'uint256[7]', name: '_prices', type: 'uint256[7]' },
      { internalType: 'uint8', name: '_acceptedPayments', type: 'uint8' },
      { internalType: 'uint256', name: '_startingTime', type: 'uint256' },
      { internalType: 'uint256', name: '_chainId', type: 'uint256' },
    ],
    name: 'listItem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_nftAddress', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'address payable', name: '_owner', type: 'address' },
      { internalType: 'uint8', name: '_paymentType', type: 'uint8' },
    ],
    name: 'buyItem',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_nftAddress', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
    ],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export const PAYMENT_TYPES = {
  MATIC: 0,
  OGUN: 1,
  USDC: 2,
  USDT: 3,
  WETH: 4,
  LINK: 5,
  AVAX: 6,
} as const

export type PaymentType = (typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES]
