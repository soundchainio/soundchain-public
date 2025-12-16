import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useMagicContext } from './useMagicContext';
import { network } from '../lib/blockchainNetworks';

/**
 * useWallet Hook
 *
 * Provides ethers-compatible wallet interface (provider, signer, address, chainId)
 * from Magic.link authentication for use with ZetaChain omnichain operations.
 */

export interface WalletState {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWallet(): WalletState {
  const { magic, account, isLoggedIn } = useMagicContext();
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize ethers provider from Magic's RPC provider
  useEffect(() => {
    const initProvider = async () => {
      if (!magic || !isLoggedIn) {
        setProvider(null);
        setSigner(null);
        setChainId(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get Magic's RPC provider and wrap with ethers
        const magicProvider = (magic as any).rpcProvider;
        if (!magicProvider) {
          throw new Error('Magic RPC provider not available');
        }

        const ethersProvider = new ethers.providers.Web3Provider(magicProvider);
        setProvider(ethersProvider);

        // Get signer for transactions
        const ethersSigner = ethersProvider.getSigner();
        setSigner(ethersSigner);

        // Get chain ID (default to Polygon mainnet)
        setChainId(network.id || 137);

      } catch (err: any) {
        console.error('[useWallet] Error initializing provider:', err);
        setError(err.message || 'Failed to initialize wallet');
        setProvider(null);
        setSigner(null);
      } finally {
        setIsLoading(false);
      }
    };

    initProvider();
  }, [magic, isLoggedIn]);

  return {
    provider,
    signer,
    address: account || null,
    chainId,
    isConnected: isLoggedIn && !!account,
    isLoading,
    error,
  };
}

export default useWallet;
