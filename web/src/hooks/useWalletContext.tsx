import { testNetwork } from 'lib/blockchainNetworks';
import { DefaultWallet } from 'lib/graphql';
import React, { createContext, useContext } from 'react';
import Web3 from 'web3';
import { useMagicContext } from './useMagicContext';
import { useMe } from './useMe';
import useMetaMask from './useMetaMask';

interface WalletContextData {
  web3?: Web3;
  account?: string;
  balance?: string;
}

const WalletContext = createContext<WalletContextData>({});

interface WalletProviderProps {}

const WalletProvider = ({ children }: React.PropsWithChildren<WalletProviderProps>) => {
  const me = useMe();
  const { account, balance, chainId, addMumbaiTestnet, connect, web3 } = useMetaMask();
  const { account: magicAccount, balance: magicBalance, web3: magicWeb3 } = useMagicContext();

  let context: WalletContextData = {};

  if (me?.defaultWallet === DefaultWallet.Soundchain) {
    context = {
      account: magicAccount,
      balance: magicBalance,
      web3: magicWeb3,
    };
  }

  let Content;

  if (me?.defaultWallet === DefaultWallet.MetaMask) {
    if (!account) {
      //   dispatchConnectWalletModal(true);
      Content = <button onClick={() => connect()}>Connect MetaMask</button>;
    }
    if (chainId !== testNetwork.id) {
      //   addMumbaiTestnet();
    }

    context = {
      account,
      balance,
      web3,
    };
  }

  return (
    <WalletContext.Provider value={context}>
      {children}
      {Content && <div className="fixed top-0 left-0 h-full w-full z-50 bg-red-600">{Content}</div>}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => useContext(WalletContext);

export default WalletProvider;
