import { Button } from 'components/Button';
import { network } from 'lib/blockchainNetworks';
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql';
import React, { createContext, ReactNode, useContext } from 'react';
import Web3 from 'web3';
import { useMagicContext } from './useMagicContext';
import { useMe } from './useMe';
import useMetaMask from './useMetaMask';

interface WalletData {
  web3?: Web3;
  account?: string;
  balance?: string;
  refetchBalance?: () => void;
}

interface WalletContextData {
  defaultWallet?: WalletData;
  soundchainWallet?: WalletData;
  metaMaskWallet?: WalletData;
}

const WalletContext = createContext<WalletContextData>({});

interface WalletProviderProps {
  children?: ReactNode | undefined;
}

const WalletProvider = ({ children }: WalletProviderProps) => {
  const me = useMe();
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation();
  const { account, balance, chainId, addMumbaiTestnet, connect, web3, refetchBalance, loading } = useMetaMask();
  const {
    account: magicAccount,
    balance: magicBalance,
    web3: magicWeb3,
    refetchBalance: magicRefetchBalance,
  } = useMagicContext();

  let defaultWallet: WalletData = {};

  if (me?.defaultWallet === DefaultWallet.Soundchain) {
    defaultWallet = {
      account: magicAccount,
      balance: magicBalance,
      web3: magicWeb3,
      refetchBalance: magicRefetchBalance,
    };
  }

  let Content;

  if (!loading && me?.defaultWallet === DefaultWallet.MetaMask) {
    if (!account) {
      Content = (
        <>
          <div>Ops! It seems you may not be connected to MetaMask</div>
          <Button variant="rainbow-xs" className="max-w-xs" onClick={() => connect()}>
            Connect to MetaMask Wallet
          </Button>
        </>
      );
    } else if (chainId !== network.id) {
      Content = (
        <>
          <div>Ops! It seems you may be connected to another network</div>
          <Button variant="rainbow-xs" onClick={() => addMumbaiTestnet()}>
            Connect to Mumbai Testnet
          </Button>
        </>
      );
    }

    defaultWallet = {
      account,
      balance,
      web3,
      refetchBalance,
    };
  }

  const context: WalletContextData = {
    defaultWallet,
    soundchainWallet: {
      account: magicAccount,
      balance: magicBalance,
      web3: magicWeb3,
      refetchBalance: magicRefetchBalance,
    },
    metaMaskWallet: {
      account,
      balance,
      web3,
      refetchBalance,
    }
  };

  return (
    <WalletContext.Provider value={context}>
      {children}
      {Content && (
        <div className="fixed top-0 left-0 h-full w-full flex flex-col items-center gap-4 justify-center z-50 bg-gray-30 bg-opacity-95 text-center text-white font-bold">
          {Content}
          <div>or you can select your SoundChain Wallet</div>
          <Button
            variant="rainbow-xs"
            onClick={() =>
              updateDefaultWallet({
                variables: {
                  input: {
                    defaultWallet: DefaultWallet.Soundchain,
                  },
                },
              })
            }
          >
            Select SoundChain Wallet
          </Button>
        </div>
      )}
    </WalletContext.Provider>
  );
};

type WalletSelection = 'Default' | DefaultWallet;
const walletSelectionMap: Record<WalletSelection, keyof WalletContextData> = {
  Default: 'defaultWallet',
  Soundchain: 'soundchainWallet',
  MetaMask: 'metaMaskWallet',
}

export const useWalletContext = (wallet: WalletSelection = 'Default'): WalletData => {
  const context = useContext(WalletContext)
  return context[walletSelectionMap[wallet]] || {};
};

export default WalletProvider;
