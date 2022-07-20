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
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      marketplaceAddress: process.env.NEXT_PUBLIC_MARKETPLACE_MUTIPLE_EDITION_ADDRESS,
    }
  },
  muxData: process.env.NEXT_PUBLIC_MUX_DATA,
  OGUNAddress: process.env.NEXT_PUBLIC_OGUN_ADRESS,
  polygonscan: process.env.NEXT_PUBLIC_POLYGONSCAN,
  redirectUrlPostLogin: process.env.NEXT_PUBLIC_REDIRECT_URL_POST_LOGIN || '/marketplace',
  soundchainFee: parseFloat(process.env.NEXT_PUBLIC_SOUNDCHAIN_FEE || '0.0195'),
  tokenStakeContractAddress: process.env.NEXT_PUBLIC_TOKEN_STAKE_CONTRACT_ADDRESS,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  airdropStatus: process.env.NEXT_PUBLIC_AIRDROP_STATUS === 'true'
};
