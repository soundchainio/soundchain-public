import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { Magic } from 'magic-sdk';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import { testNetwork } from '../lib/blockchainNetworks';
import { useMe } from './useMe';

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || '';

interface MagicContextData {
  magic: InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>> | undefined;
  web3: Web3 | undefined;
  account: string | null | undefined;
  balance: string | undefined;
}

const MagicContext = createContext<MagicContextData>({} as MagicContextData);

interface MagicProviderProps {
  children: ReactNode;
}

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe();
  const [magic, setMagic] = useState<InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>>>();
  const [web3, setWeb3] = useState<Web3>();
  const [account, setAccount] = useState<string | null>();
  const [balance, setBalance] = useState<string>();

  useEffect(() => {
    const magic = new Magic(magicPublicKey, {
      network: {
        rpcUrl: testNetwork.rpc,
        chainId: testNetwork.id,
      },
    });
    magic.preload();
    setMagic(magic);
    setWeb3(new Web3(magic.rpcProvider));
  }, []);

  useEffect(() => {
    if (me && me.walletAddress && web3) {
      setAccount(me.walletAddress);
      web3.eth.getBalance(me.walletAddress).then(balance => {
        setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
      });
    }
  }, [me, web3]);

  return <MagicContext.Provider value={{ magic, web3, account, balance }}>{children}</MagicContext.Provider>;
}

export const useMagicContext = () => useContext(MagicContext);
