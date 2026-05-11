/**
 * Soundchain721Editions — minimal ABI for the mint flow.
 *
 * Full ABI lives at /soundchain-contracts/artifacts/.../Soundchain721Editions.json.
 * Pruned here to the methods mint actually calls + the events it listens for.
 */

export const editionsAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'editionQuantity', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint8', name: '_royaltyPercentage', type: 'uint8' },
    ],
    name: 'createEdition',
    outputs: [{ internalType: 'uint256', name: 'retEditionNumber', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: '_tokenURI', type: 'string' },
      { internalType: 'uint256', name: 'editionNumber', type: 'uint256' },
      { internalType: 'uint16', name: 'quantity', type: 'uint16' },
    ],
    name: 'safeMintToEditionQuantity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'editionNumber', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'quantity', type: 'uint256' },
    ],
    name: 'EditionCreated',
    type: 'event',
  },
] as const
