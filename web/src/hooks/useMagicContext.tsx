/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { setJwt } from 'lib/apollo';
import { Magic, RPCErrorCode } from 'magic-sdk';
import { useRouter } from 'next/router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import { network } from '../lib/blockchainNetworks';
import { useMe } from './useMe';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import { config } from 'config';
import { AbiItem } from 'web3-utils'

const magicPublicKey = process.env.NEXT_PUBLIC_MAGIC_KEY || '';

interface MagicContextData {
  magic: InstanceWithExtensions<SDKBase, OAuthExtension[]>;
  web3: Web3;
  account: string | undefined;
  balance: string | undefined;
  ogunBalance: string | undefined;
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
  //  eslint-disable-next-line @typescript-eslint/no-explicit-any
  return magic ? new Web3(magic.rpcProvider as any) : null;
};

const web3: Web3 = createWeb3(magic)!;

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe();
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [ogunBalance, setOgunBalance] = useState<string>();
  const [isRefetchingBalance, setIsRefetchingBalance] = useState<boolean>(false);
  const router = useRouter();

  const refetchBalance = async () => {
    if (account) {
      setIsRefetchingBalance(true);

      const tokenAddress = config.OGUNAddress;
      const contract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], tokenAddress);
      const tokenAmount = await contract.methods.balanceOf(account).call();

      await web3.eth.getBalance(account).then(balance => {
        setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
        setOgunBalance(Number(web3.utils.fromWei(tokenAmount, 'ether')).toFixed(6));
        setIsRefetchingBalance(false)
      });
    }
  };

  useEffect(() => {
    if (me && web3) {
      web3.eth
        .getAccounts()
        .then(async ([account]) => {
          setAccount(account);
          const tokenAddress = config.OGUNAddress;
          const contract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], tokenAddress);
          const tokenAmount = await contract.methods.balanceOf(account).call();
          setOgunBalance(Number(web3.utils.fromWei(tokenAmount, 'ether')).toFixed(6));

          return web3.eth.getBalance(account);
        })
        .then(balance => {
          setBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(6));
        }).catch(async (e) => {
          if (e.code === RPCErrorCode.InternalError) {
            await magic.user.logout();
            setJwt();
            router.reload();
          }
        });
    }
  }, [me, router]);

  return (
    <MagicContext.Provider value={{ magic, web3, account, balance, ogunBalance, refetchBalance, isRefetchingBalance }}>
      {children}
    </MagicContext.Provider>
  );
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
