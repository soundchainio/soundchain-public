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
  // SoundChain Safe treasury address for collecting platform fees (lowercase for compatibility)
  treasuryAddress: process.env.NEXT_PUBLIC_SOUNDCHAIN_TREASURY || '0x519bed3fe32272fa8f1aecaf86dbfbd674ee703b',
  tokenStakeContractAddress: process.env.NEXT_PUBLIC_OGUN_STAKE_CONTRACT_ADDRESS,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.1',
  airdropStatus: process.env.NEXT_PUBLIC_AIRDROP_STATUS === 'true',
  sentryUrl: process.env.NEXT_PUBLIC_SENTRY_URL,
  gtmId: process.env.NEXT_PUBLIC_GTM_ID,
  // Permanent Post Pricing - pay to convert 24hr ephemeral posts to permanent
  // Pricing scales with file size - larger files cost more to store permanently
  permanentPostPricing: {
    tiers: [
      { maxSizeBytes: 0, ogun: 5, pol: 0.1, label: 'Text-only' },
      { maxSizeBytes: 1024 * 1024, ogun: 10, pol: 0.25, label: '<1 MB' },
      { maxSizeBytes: 10 * 1024 * 1024, ogun: 25, pol: 0.5, label: '1-10 MB' },
      { maxSizeBytes: 50 * 1024 * 1024, ogun: 75, pol: 1.5, label: '10-50 MB' },
      { maxSizeBytes: 100 * 1024 * 1024, ogun: 150, pol: 3, label: '50-100 MB' },
      { maxSizeBytes: 250 * 1024 * 1024, ogun: 300, pol: 6, label: '100-250 MB' },
      { maxSizeBytes: 500 * 1024 * 1024, ogun: 500, pol: 10, label: '250-500 MB' },
      { maxSizeBytes: 1024 * 1024 * 1024, ogun: 800, pol: 16, label: '500 MB-1 GB' },
    ],
    removalFeeMultiplier: 0.5, // 50% of original price to remove
    platformFeeRate: 0.005, // 0.5% platform fee on permanent posts (higher than trades)
  },
}
// GitHub webhook test - Fri Jan 30 18:00:00 MST 2026
