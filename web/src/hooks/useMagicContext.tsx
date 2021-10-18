import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { Magic } from 'magic-sdk';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import { testNetwork } from '../lib/blockchainNetworks';
import { useMe } from './useMe';

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || '';

interface MagicContextData {
  magic: InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>>;
  web3: Web3;
  account: string | undefined;
  balance: string | undefined;
}

const MagicContext = createContext<MagicContextData>({} as MagicContextData);

interface MagicProviderProps {
  children: ReactNode;
}

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe();
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();

  const magic = new Magic(magicPublicKey, {
    network: {
      rpcUrl: testNetwork.rpc,
      chainId: testNetwork.id,
    },
  });

  const web3 = new Web3(magic.rpcProvider);

  useEffect(() => {
    if (me && me.walletAddress) {
      setAccount(me.walletAddress);
      web3.eth.getBalance(me.walletAddress).then(balance => {
        setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
      });
    }
  }, [me]);

  return <MagicContext.Provider value={{ magic, web3, account, balance }}>{children}</MagicContext.Provider>;
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
