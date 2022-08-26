/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthExtension } from '@magic-ext/oauth';
import { InstanceWithExtensions, MagicSDKExtensionsOption, SDKBase } from '@magic-sdk/provider';
import { setJwt } from 'lib/apollo';
import { Magic, RPCErrorCode } from 'magic-sdk';
import { useRouter } from 'next/router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Web3 from 'web3';
import { network } from '../lib/blockchainNetworks';
import { useMe } from './useMe';
import { errorHandler } from 'utils/errorHandler';
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json';
import { config } from 'config';
import { AbiItem } from 'web3-utils';
import { toast } from 'react-toastify';

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
const tokenAddress = config.ogunTokenAddress;

export function MagicProvider({ children }: MagicProviderProps) {
  const me = useMe();
  const [account, setAccount] = useState('');
  const [maticBalance, setMaticBalance] = useState('');
  const [ogunBalance, setOgunBalance] = useState('');
  const [isRefetchingBalance, setIsRefetchingBalance] = useState(false);

  const router = useRouter();
  const isLoginPage = router.pathname.includes('/login');

  const handleError = useCallback(
    async error => {
      if (error.code === RPCErrorCode.InternalError && !isLoginPage) {
        await magic.user.logout();
        setJwt();
        router.push('/login');
      }

      errorHandler(error);
    },
    [isLoginPage, router],
  );

  const refetchBalance = async () => {
    try {
      setIsRefetchingBalance(true);

      await handleSetBalance();
      await handleSetOgunBalance();
    } catch (error) {
      handleError(error);
    } finally {
      setIsRefetchingBalance(false);
    }
  };

  const handleSetAccount = useCallback(async () => {
    try {
      const [account] = await web3.eth.getAccounts();
      setAccount(account);
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const handleSetBalance = useCallback(async () => {
    try {
      if (!account) return toast.error('Not logged in.');

      const maticBalance = await web3.eth.getBalance(account);

      setMaticBalance(Number(web3.utils.fromWei(maticBalance, 'ether')).toFixed(6));
    } catch (error) {
      handleError(error);
    }
  }, [account, handleError]);

  const handleSetOgunBalance = useCallback(async () => {
    try {
      if (!account) return toast.error('Not logged in.');

      if (!tokenAddress) throw Error('No token contract address found when setting Ogun balance');

      const ogunContract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], tokenAddress);
      const tokenAmount = await ogunContract.methods.balanceOf(account).call();
      const tokenAmountInEther = Number(web3.utils.fromWei(tokenAmount, 'ether')).toFixed(6);

      setOgunBalance(tokenAmountInEther);
    } catch (error) {
      handleError(error);
    }
  }, [account, handleError]);

  const handleUseEffect = useCallback(async () => {
    if (!account) await handleSetAccount();

    await handleSetOgunBalance();
    await handleSetBalance();
  }, [account, handleSetAccount, handleSetBalance, handleSetOgunBalance]);

  useEffect(() => {
    if (!me && !web3) return;

    handleUseEffect();
  }, [handleUseEffect, me]);

  return (
    <MagicContext.Provider
      value={{ magic, web3, account, balance: maticBalance, ogunBalance, refetchBalance, isRefetchingBalance }}
    >
      {children}
    </MagicContext.Provider>
  );
}

export const useMagicContext = () => useContext(MagicContext);

export default MagicProvider;
