import '@nomiclabs/hardhat-ethers';

const { ALCHEMY_API_KEY, WALLET_PRIVATE_KEY } = process.env;

export const defaultNetwork = 'matic';

export const solidity = {
  version: '0.8.2',
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
export const networks = {
  hardhat: {},
  matic: {
    url: ALCHEMY_API_KEY,
    accounts: [`0x${WALLET_PRIVATE_KEY}`],
  },
};
export const paths = {
  sources: './contract',
  tests: './test',
  cache: './cache',
  artifacts: './src/artifacts',
};

export const mocha = {
  timeout: 20000,
};
