/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { Magic } from 'magic-sdk';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import { network } from '../lib/blockchainNetworks';
import { useMe } from './useMe';

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || '';

interface MagicContextData {
  magic: InstanceWithExtensions<SDKBase, OAuthExtension[]>;
  web3: Web3;
  account: string | undefined;
  balance: string | undefined;
  refetchBalance: () => Promise<void>;
  isRefetchingBalance: boolean;
}

const MagicContext = createContext<MagicContextData>({} as MagicContextData);

interface MagicProviderProps {
  children: ReactNode;
}

// Create client-side Magic instance
const createMagic = (magicPublicKey: string) => {
  return typeof window != 'undefined'
    ? new Magic(magicPublicKey, {
        network: {
          rpcUrl: network.rpc,
          chainId: network.id,
        },
        extensions: [new OAuthExtension()],
      })
    : null;
};

export const magic = createMagic(magicPublicKey)!;

// Create Web3 instance
const createWeb3 = (
  magic:
    | false
    | InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>>
    | InstanceWithExtensions<SDKBase, OAuthExtension[]>,
) => {
  return magic ? new Web3(magic.rpcProvider) : null;
};

const web3: Web3 = createWeb3(magic)!;

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe();
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [isRefetchingBalance, setIsRefetchingBalance] = useState<boolean>(false);

  const refetchBalance = async () => {
    if (account) {
      setIsRefetchingBalance(true);
      await web3.eth.getBalance(account).then(balance => {
        setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
        setIsRefetchingBalance(false);
      });
    }
  };

  useEffect(() => {
    if (me && web3) {
      web3.eth
        .getAccounts()
        .then(([account]) => {
          setAccount(account);
          return web3.eth.getBalance(account);
        })
        .then(balance => {
          setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
        });
    }
  }, [me]);

  return (
    <MagicContext.Provider value={{ magic, web3, account, balance, refetchBalance, isRefetchingBalance }}>
      {children}
    </MagicContext.Provider>
  );
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
