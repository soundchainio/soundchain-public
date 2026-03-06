import { useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { CHAINS, getChainById } from '../constants/chains';

/**
 * ZetaChain Omnichain Integration Hook
 *
 * Enables cross-chain NFT purchases, swaps, and royalty claims
 * across 23+ blockchain networks via ZetaChain's universal messaging.
 *
 * Fee: 0.05% (5 basis points) - collected by Gnosis Safe
 */

// Contract ABIs (simplified - full ABIs in /src/contract/omnichain/)
const OMNICHAIN_ABI = [
  'function calculateFee(uint256 amount) view returns (uint256)',
  'function getSupportedChains() view returns (uint256[])',
  'function enabledChains(uint256 chainId) view returns (bool)',
  'event CrossChainPurchase(uint256 indexed sourceChain, address indexed buyer, address zrc20Token, uint256 amount, bytes32 nftId)',
  'event CrossChainSwap(uint256 indexed sourceChain, address indexed user, address fromToken, address toToken, uint256 amountIn, uint256 amountOut)',
  'event FeeCollected(address indexed token, uint256 amount, address indexed recipient)',
];

const FEE_COLLECTOR_ABI = [
  'function calculateFee(uint256 amount) view returns (uint256)',
  'function feeRate() view returns (uint256)',
  'function gnosisSafe() view returns (address)',
  'function totalFeesCollected(address token) view returns (uint256)',
];

const NFT_BRIDGE_ABI = [
  'function lockAndBridge(address nftContract, uint256 tokenId, uint256 targetChainId, string tokenURI) payable returns (bytes32)',
  'function cancelBridge(bytes32 bridgeId)',
  'function bridgeFee() view returns (uint256)',
  'function isNFTLocked(address nftContract, uint256 tokenId) view returns (bool)',
  'function getBridgeRequest(bytes32 bridgeId) view returns (tuple(uint256 sourceChainId, uint256 targetChainId, address nftContract, uint256 tokenId, address owner, string tokenURI, uint256 timestamp, bool completed))',
  'event NFTLocked(uint256 indexed sourceChainId, uint256 indexed targetChainId, address indexed nftContract, uint256 tokenId, address owner, string tokenURI, bytes32 bridgeId)',
];

// Contract addresses per chain
const CONTRACT_ADDRESSES: Record<number, {
  omnichain?: string;
  feeCollector?: string;
  nftBridge?: string;
}> = {
  // Polygon (primary chain)
  137: {
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_137 || '',
    nftBridge: process.env.NEXT_PUBLIC_NFT_BRIDGE_137 || '',
  },
  // ZetaChain
  7000: {
    omnichain: process.env.NEXT_PUBLIC_OMNICHAIN_7000 || '',
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_7000 || '',
    nftBridge: process.env.NEXT_PUBLIC_NFT_BRIDGE_7000 || '',
  },
  // Ethereum
  1: {
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_1 || '',
    nftBridge: process.env.NEXT_PUBLIC_NFT_BRIDGE_1 || '',
  },
  // Base
  8453: {
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_8453 || '',
    nftBridge: process.env.NEXT_PUBLIC_NFT_BRIDGE_8453 || '',
  },
  // Arbitrum
  42161: {
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_42161 || '',
    nftBridge: process.env.NEXT_PUBLIC_NFT_BRIDGE_42161 || '',
  },
};

// Message types for cross-chain calls
const MSG_TYPE = {
  PURCHASE: 1,
  SWAP: 2,
  BRIDGE_NFT: 3,
  CLAIM_ROYALTY: 4,
};

export interface CrossChainPurchaseParams {
  nftId: string;
  priceInSourceToken: string;
  sourceChainId: number;
  recipientOnPolygon: string;
  nftContractAddress: string;
}

export interface CrossChainSwapParams {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  amountIn: string;
  minAmountOut: string;
  recipient: string;
}

export interface BridgeNFTParams {
  nftContract: string;
  tokenId: string;
  targetChainId: number;
  tokenURI: string;
}

export interface OmnichainState {
  isLoading: boolean;
  error: string | null;
  supportedChains: number[];
  currentChainId: number | null;
  feeRate: number; // In basis points (5 = 0.05%)
}

export function useOmnichain() {
  const { provider, signer, address, chainId } = useWallet();
  const [state, setState] = useState<OmnichainState>({
    isLoading: false,
    error: null,
    supportedChains: [1, 137, 7000, 8453, 42161, 10, 43114, 81457],
    currentChainId: null,
    feeRate: 5, // 0.05%
  });

  // Get contract instances
  const getContracts = useCallback((targetChainId?: number) => {
    const id = targetChainId || chainId;
    if (!id || !provider) return null;

    const addresses = CONTRACT_ADDRESSES[id];
    if (!addresses) return null;

    const signerOrProvider = signer || provider;

    return {
      omnichain: addresses.omnichain
        ? new ethers.Contract(addresses.omnichain, OMNICHAIN_ABI, signerOrProvider)
        : null,
      feeCollector: addresses.feeCollector
        ? new ethers.Contract(addresses.feeCollector, FEE_COLLECTOR_ABI, signerOrProvider)
        : null,
      nftBridge: addresses.nftBridge
        ? new ethers.Contract(addresses.nftBridge, NFT_BRIDGE_ABI, signerOrProvider)
        : null,
    };
  }, [provider, signer, chainId]);

  /**
   * Calculate fee for a given amount
   * @param amount Amount in wei
   * @returns Fee amount in wei
   */
  const calculateFee = useCallback(async (amount: string): Promise<string> => {
    const contracts = getContracts();
    if (!contracts?.feeCollector) {
      // Fallback calculation: 0.05%
      const amountBN = ethers.BigNumber.from(amount);
      return amountBN.mul(5).div(10000).toString();
    }

    try {
      const fee = await contracts.feeCollector.calculateFee(amount);
      return fee.toString();
    } catch (error) {
      console.error('Error calculating fee:', error);
      const amountBN = ethers.BigNumber.from(amount);
      return amountBN.mul(5).div(10000).toString();
    }
  }, [getContracts]);

  /**
   * Bridge NFT to another chain
   */
  const bridgeNFT = useCallback(async (params: BridgeNFTParams): Promise<string> => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const contracts = getContracts();
      if (!contracts?.nftBridge) {
        throw new Error('NFT Bridge not available on this chain');
      }

      // Get bridge fee
      const bridgeFee = await contracts.nftBridge.bridgeFee();

      // Lock and bridge
      const tx = await contracts.nftBridge.lockAndBridge(
        params.nftContract,
        params.tokenId,
        params.targetChainId,
        params.tokenURI,
        { value: bridgeFee }
      );

      const receipt = await tx.wait();

      // Extract bridge ID from event
      const event = receipt.events?.find((e: any) => e.event === 'NFTLocked');
      const bridgeId = event?.args?.bridgeId || '';

      setState(s => ({ ...s, isLoading: false }));
      return bridgeId;
    } catch (error: any) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      throw error;
    }
  }, [getContracts]);

  /**
   * Check if NFT is locked in bridge
   */
  const isNFTLocked = useCallback(async (
    nftContract: string,
    tokenId: string
  ): Promise<boolean> => {
    const contracts = getContracts();
    if (!contracts?.nftBridge) return false;

    try {
      return await contracts.nftBridge.isNFTLocked(nftContract, tokenId);
    } catch {
      return false;
    }
  }, [getContracts]);

  /**
   * Get bridge request details
   */
  const getBridgeRequest = useCallback(async (bridgeId: string) => {
    const contracts = getContracts();
    if (!contracts?.nftBridge) return null;

    try {
      return await contracts.nftBridge.getBridgeRequest(bridgeId);
    } catch {
      return null;
    }
  }, [getContracts]);

  /**
   * Get chain info with cross-chain capabilities
   */
  const getChainInfo = useCallback((targetChainId: number) => {
    const chain = getChainById(targetChainId.toString());
    const hasContracts = !!CONTRACT_ADDRESSES[targetChainId];
    const isSupported = state.supportedChains.includes(targetChainId);

    return {
      chain,
      hasContracts,
      isSupported,
      canBridge: isSupported && hasContracts,
    };
  }, [state.supportedChains]);

  /**
   * Encode cross-chain purchase message
   */
  const encodePurchaseMessage = useCallback((params: CrossChainPurchaseParams): string => {
    const abiCoder = new ethers.utils.AbiCoder();
    const payload = abiCoder.encode(
      ['bytes32', 'address', 'address'],
      [
        ethers.utils.formatBytes32String(params.nftId.slice(0, 31)),
        params.recipientOnPolygon,
        params.nftContractAddress,
      ]
    );

    // Prepend message type
    return ethers.utils.hexConcat([
      ethers.utils.hexlify([MSG_TYPE.PURCHASE]),
      payload,
    ]);
  }, []);

  /**
   * Encode cross-chain swap message
   */
  const encodeSwapMessage = useCallback((params: CrossChainSwapParams): string => {
    const abiCoder = new ethers.utils.AbiCoder();
    const payload = abiCoder.encode(
      ['uint256', 'address', 'address', 'uint256'],
      [
        params.toChainId,
        params.toToken,
        params.recipient,
        params.minAmountOut,
      ]
    );

    return ethers.utils.hexConcat([
      ethers.utils.hexlify([MSG_TYPE.SWAP]),
      payload,
    ]);
  }, []);

  return {
    ...state,
    chainId,
    address,
    calculateFee,
    bridgeNFT,
    isNFTLocked,
    getBridgeRequest,
    getChainInfo,
    encodePurchaseMessage,
    encodeSwapMessage,
    contracts: getContracts(),
    isConnected: !!address,
    isZetaChain: chainId === 7000 || chainId === 7001,
  };
}

export default useOmnichain;
