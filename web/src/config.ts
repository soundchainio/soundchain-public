export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  domainUrl: process.env.NEXT_PUBLIC_DOMAIN_URL,
  ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
  lpStakeContractAddress: process.env.NEXT_PUBLIC_LP_STAKE_CONTRACT_ADDRESS,
  lpTokenAddress: process.env.NEXT_PUBLIC_LP_TOKEN_ADRESS,
  magicKey: process.env.NEXT_PUBLIC_MAGIC_KEY,
  web3: {
    contractsV1: {
      marketplaceAddress: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
      auctionAddress: process.env.NEXT_PUBLIC_AUCTION_ADDRESS,
    },
    contractsV2: {
      auctionAddress: process.env.NEXT_PUBLIC_AUCTION_V2_ADDRESS,
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      marketplaceAddress: process.env.NEXT_PUBLIC_MARKETPLACE_MUTIPLE_EDITION_ADDRESS,
    },
  },
  muxData: process.env.NEXT_PUBLIC_MUX_DATA,
  claimOgunAddress: process.env.NEXT_PUBLIC_AIRDROP_CONTRACT_ADDRESS,
  ogunTokenAddress: process.env.NEXT_PUBLIC_OGUN_ADRESS,
  polygonscan: process.env.NEXT_PUBLIC_POLYGONSCAN,
  redirectUrlPostLogin: process.env.NEXT_PUBLIC_REDIRECT_URL_POST_LOGIN || '/dex',
  // Platform fee rate: 0.05% (0.0005) - applied to sale price for marketplace
  soundchainFee: parseFloat(process.env.NEXT_PUBLIC_SOUNDCHAIN_FEE || '0.0005'),
  // Flat fee per NFT minted (in POL) - 0.01 POL per NFT
  mintFeePerNft: parseFloat(process.env.NEXT_PUBLIC_MINT_FEE_PER_NFT || '0.01'),
  // SoundChain treasury address for collecting platform fees
  treasuryAddress: process.env.NEXT_PUBLIC_SOUNDCHAIN_TREASURY || '0x45f1af89486aeec2da0b06340cd9cd3bd741a15c',
  tokenStakeContractAddress: process.env.NEXT_PUBLIC_OGUN_STAKE_CONTRACT_ADDRESS,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.1',
  airdropStatus: process.env.NEXT_PUBLIC_AIRDROP_STATUS === 'true',
  sentryUrl: process.env.NEXT_PUBLIC_SENTRY_URL,
  gtmId: process.env.NEXT_PUBLIC_GTM_ID,
}
