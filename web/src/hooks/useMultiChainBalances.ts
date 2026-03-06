/**
 * Multi-Chain Balance Aggregator Hook
 * Fetches native token and OGUN balances across multiple chains
 * Supports: Polygon, Ethereum, ZetaChain, Base, Arbitrum, Optimism
 */

import { useState, useEffect, useCallback } from 'react'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { CHAINS, ChainConfig } from '../constants/chains'
import SoundchainOGUN20 from '../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { config } from '../config'

export interface ChainBalance {
  chainId: string
  chainName: string
  icon: string
  color: string
  nativeBalance: string
  nativeSymbol: string
  ogunBalance: string
  usdValue?: string
  isLoading: boolean
  error?: string
}

export interface MultiChainBalanceResult {
  balances: ChainBalance[]
  totalOgunBalance: string
  totalUsdValue: string
  isLoading: boolean
  refetch: () => Promise<void>
}

// Chains we actively query for balances
const ACTIVE_CHAINS = ['polygon', 'ethereum', 'zetachain', 'base', 'arbitrum', 'optimism']

// OGUN token addresses per chain (Polygon is primary)
const OGUN_ADDRESSES: Record<string, string | undefined> = {
  polygon: config.ogunTokenAddress,
  // Add other chain OGUN addresses when deployed
}

// Create Web3 instances for each chain
const getWeb3ForChain = (chainId: string): Web3 | null => {
  const chain = CHAINS[chainId]
  if (!chain?.rpcUrl) return null

  try {
    return new Web3(chain.rpcUrl)
  } catch {
    console.error(`Failed to create Web3 for ${chainId}`)
    return null
  }
}

// Fetch native balance for a chain
const fetchNativeBalance = async (
  web3: Web3,
  address: string
): Promise<string> => {
  try {
    const balance = await web3.eth.getBalance(address)
    return Number(web3.utils.fromWei(balance, 'ether')).toFixed(4)
  } catch {
    return '0'
  }
}

// Fetch OGUN balance for a chain
const fetchOgunBalance = async (
  web3: Web3,
  address: string,
  ogunAddress: string
): Promise<string> => {
  try {
    const contract = new web3.eth.Contract(
      SoundchainOGUN20.abi as AbiItem[],
      ogunAddress
    )
    const balance = await contract.methods.balanceOf(address).call()
    const validBalance = typeof balance === 'bigint' ? balance.toString() : String(balance || '0')
    return Number(web3.utils.fromWei(validBalance, 'ether')).toFixed(2)
  } catch {
    return '0'
  }
}

export function useMultiChainBalances(address: string | undefined): MultiChainBalanceResult {
  const [balances, setBalances] = useState<ChainBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAllBalances = useCallback(async () => {
    if (!address) {
      setBalances([])
      return
    }

    setIsLoading(true)

    const results: ChainBalance[] = await Promise.all(
      ACTIVE_CHAINS.map(async (chainId) => {
        const chain = CHAINS[chainId]
        if (!chain) {
          return {
            chainId,
            chainName: chainId,
            icon: '?',
            color: '#888',
            nativeBalance: '0',
            nativeSymbol: '???',
            ogunBalance: '0',
            isLoading: false,
            error: 'Chain not found',
          }
        }

        const web3 = getWeb3ForChain(chainId)
        if (!web3) {
          return {
            chainId,
            chainName: chain.displayName,
            icon: chain.icon,
            color: chain.color,
            nativeBalance: '0',
            nativeSymbol: chain.nativeCurrency?.symbol || '???',
            ogunBalance: '0',
            isLoading: false,
            error: 'No RPC available',
          }
        }

        try {
          // Fetch native balance
          const nativeBalance = await fetchNativeBalance(web3, address)

          // Fetch OGUN balance if available on this chain
          let ogunBalance = '0'
          const ogunAddress = OGUN_ADDRESSES[chainId]
          if (ogunAddress) {
            ogunBalance = await fetchOgunBalance(web3, address, ogunAddress)
          }

          return {
            chainId,
            chainName: chain.displayName,
            icon: chain.icon,
            color: chain.color,
            nativeBalance,
            nativeSymbol: chain.nativeCurrency?.symbol || '???',
            ogunBalance,
            isLoading: false,
          }
        } catch (error: any) {
          return {
            chainId,
            chainName: chain.displayName,
            icon: chain.icon,
            color: chain.color,
            nativeBalance: '0',
            nativeSymbol: chain.nativeCurrency?.symbol || '???',
            ogunBalance: '0',
            isLoading: false,
            error: error.message,
          }
        }
      })
    )

    setBalances(results)
    setIsLoading(false)
  }, [address])

  // Fetch on mount and address change
  useEffect(() => {
    fetchAllBalances()
  }, [fetchAllBalances])

  // Calculate totals
  const totalOgunBalance = balances.reduce((sum, b) => sum + parseFloat(b.ogunBalance || '0'), 0).toFixed(2)
  const totalUsdValue = '0' // TODO: Integrate price feed

  return {
    balances,
    totalOgunBalance,
    totalUsdValue,
    isLoading,
    refetch: fetchAllBalances,
  }
}

export default useMultiChainBalances
