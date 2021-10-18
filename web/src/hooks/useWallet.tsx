import { testNetwork } from 'lib/blockchainNetworks';
import { DefaultWallet } from 'lib/graphql';
import Web3 from 'web3';
import { useMagicContext } from './useMagicContext';
import { useMe } from './useMe';
import useMetaMask from './useMetaMask';

export interface WalletProps {
  web3?: Web3;
  account?: string;
  balance?: string;
}

export const useWallet = () => {
  const me = useMe();
  const { account, balance, chainId, connect, addMumbaiTestnet, web3 } = useMetaMask();
  const { account: magicAccount, balance: magicBalance, web3: magicWeb3 } = useMagicContext();

  if (me?.defaultWallet === DefaultWallet.Soundchain) {
    return {
      account: magicAccount,
      balance: magicBalance,
      web3: magicWeb3,
    };
  }

  if (me?.defaultWallet === DefaultWallet.MetaMask) {
    if (!account) {
      connect();
    }
    if (chainId !== testNetwork.id) {
      addMumbaiTestnet();
    }

    return {
      account,
      balance,
      web3,
    };
  }

  return {
    account: undefined,
    balance: undefined,
    web3: undefined,
  };
};
