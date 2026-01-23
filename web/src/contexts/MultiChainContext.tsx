'use client'

/**
 * MultiChainContext - EVM Multi-Chain Balance Viewing
 *
 * This context allows users to view their balances across multiple EVM chains.
 * Key insight: EVM addresses are identical across all chains - we just switch RPC endpoints.
 *
 * IMPORTANT: Magic SDK stays fixed on Polygon (where OGUN lives).
 * This context uses separate read-only Web3 providers for viewing balances on other chains.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import Web3 from 'web3'
import {
  BlockchainNetwork,
  SUPPORTED_NETWORKS,
  mainNetwork,
  ethereumNetwork,
  baseNetwork,
  arbitrumNetwork,
  optimismNetwork,
  getMainnetNetworks,
  isOgunAvailable,
} from '../lib/blockchainNetworks'

const SELECTED_CHAIN_KEY = 'soundchain_selected_viewing_chain'

export interface ChainBalance {
  chainId: number
  chainName: string
  symbol: string
  balance: string
  isLoading: boolean
  error?: string
}

export interface MultiChainContextState {
  // Selected viewing chain
  selectedChainId: number
  selectedNetwork: BlockchainNetwork

  // All available networks
  availableNetworks: BlockchainNetwork[]

  // Switch viewing chain
  switchViewingChain: (chainId: number) => void

  // Balance for selected chain
  selectedChainBalance: string | null
  isLoadingBalance: boolean

  // All chain balances (for overview)
  allChainBalances: ChainBalance[]
  refreshAllBalances: () => Promise<void>

  // OGUN availability
  isOgunAvailableOnSelectedChain: boolean

  // Web3 instance for selected chain (read-only)
  web3ForSelectedChain: Web3 | null
}

const defaultState: MultiChainContextState = {
  selectedChainId: 137,
  selectedNetwork: mainNetwork,
  availableNetworks: getMainnetNetworks(),
  switchViewingChain: () => {},
  selectedChainBalance: null,
  isLoadingBalance: false,
  allChainBalances: [],
  refreshAllBalances: async () => {},
  isOgunAvailableOnSelectedChain: true,
  web3ForSelectedChain: null,
}

const MultiChainContext = createContext<MultiChainContextState>(defaultState)

interface MultiChainProviderProps {
  children: ReactNode
  walletAddress?: string | null
}

export function MultiChainProvider({ children, walletAddress }: MultiChainProviderProps) {
  const [selectedChainId, setSelectedChainId] = useState<number>(137)
  const [selectedChainBalance, setSelectedChainBalance] = useState<string | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [allChainBalances, setAllChainBalances] = useState<ChainBalance[]>([])
  const [web3Instances, setWeb3Instances] = useState<Record<number, Web3>>({})

  const balanceFetchRef = useRef<AbortController | null>(null)
  const lastFetchedAddress = useRef<string | null>(null)

  // Get selected network from chain ID
  const selectedNetwork = SUPPORTED_NETWORKS[selectedChainId] || mainNetwork
  const availableNetworks = getMainnetNetworks()

  // Initialize Web3 instances for all chains (read-only, public RPCs)
  useEffect(() => {
    const instances: Record<number, Web3> = {}

    for (const network of availableNetworks) {
      try {
        instances[network.id] = new Web3(network.rpc)
      } catch (err) {
        console.warn(`Failed to create Web3 instance for ${network.name}:`, err)
      }
    }

    setWeb3Instances(instances)
  }, [])

  // Load persisted chain selection on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChainId = localStorage.getItem(SELECTED_CHAIN_KEY)
      if (savedChainId) {
        const chainId = parseInt(savedChainId, 10)
        if (SUPPORTED_NETWORKS[chainId]) {
          setSelectedChainId(chainId)
        }
      }
    }
  }, [])

  // Switch viewing chain
  const switchViewingChain = useCallback((chainId: number) => {
    if (!SUPPORTED_NETWORKS[chainId]) {
      console.warn(`Unsupported chain ID: ${chainId}`)
      return
    }

    setSelectedChainId(chainId)
    localStorage.setItem(SELECTED_CHAIN_KEY, String(chainId))

    // Reset balance to trigger refetch
    setSelectedChainBalance(null)
  }, [])

  // Fetch balance for a specific chain
  const fetchBalanceForChain = useCallback(async (
    chainId: number,
    address: string
  ): Promise<{ balance: string; error?: string }> => {
    const web3 = web3Instances[chainId]
    if (!web3) {
      return { balance: '0', error: 'Web3 not available' }
    }

    try {
      const balance = await web3.eth.getBalance(address)
      const formattedBalance = Number(web3.utils.fromWei(balance, 'ether')).toFixed(6)
      return { balance: formattedBalance }
    } catch (err: any) {
      console.warn(`Failed to fetch balance for chain ${chainId}:`, err?.message)
      return { balance: '0', error: err?.message || 'Failed to fetch' }
    }
  }, [web3Instances])

  // Fetch balance for selected chain
  useEffect(() => {
    if (!walletAddress || Object.keys(web3Instances).length === 0) {
      setSelectedChainBalance(null)
      return
    }

    const fetchSelectedBalance = async () => {
      setIsLoadingBalance(true)
      const result = await fetchBalanceForChain(selectedChainId, walletAddress)
      setSelectedChainBalance(result.balance)
      setIsLoadingBalance(false)
    }

    fetchSelectedBalance()
  }, [selectedChainId, walletAddress, web3Instances, fetchBalanceForChain])

  // Refresh all chain balances
  const refreshAllBalances = useCallback(async () => {
    if (!walletAddress || Object.keys(web3Instances).length === 0) {
      return
    }

    // Cancel any ongoing fetch
    if (balanceFetchRef.current) {
      balanceFetchRef.current.abort()
    }
    balanceFetchRef.current = new AbortController()

    // Skip if we just fetched for this address
    if (lastFetchedAddress.current === walletAddress && allChainBalances.length > 0) {
      return
    }
    lastFetchedAddress.current = walletAddress

    // Initialize with loading state
    const initialBalances: ChainBalance[] = availableNetworks.map(network => ({
      chainId: network.id,
      chainName: network.name,
      symbol: network.symbol,
      balance: '0',
      isLoading: true,
    }))
    setAllChainBalances(initialBalances)

    // Fetch all balances in parallel
    const balancePromises = availableNetworks.map(async (network) => {
      const result = await fetchBalanceForChain(network.id, walletAddress)
      return {
        chainId: network.id,
        chainName: network.name,
        symbol: network.symbol,
        balance: result.balance,
        isLoading: false,
        error: result.error,
      }
    })

    const results = await Promise.all(balancePromises)

    // Only update if not aborted
    if (!balanceFetchRef.current?.signal.aborted) {
      setAllChainBalances(results)
    }
  }, [walletAddress, web3Instances, availableNetworks, fetchBalanceForChain, allChainBalances.length])

  // Auto-fetch all balances when wallet address changes
  useEffect(() => {
    if (walletAddress && Object.keys(web3Instances).length > 0) {
      refreshAllBalances()
    }
  }, [walletAddress, web3Instances])

  const value: MultiChainContextState = {
    selectedChainId,
    selectedNetwork,
    availableNetworks,
    switchViewingChain,
    selectedChainBalance,
    isLoadingBalance,
    allChainBalances,
    refreshAllBalances,
    isOgunAvailableOnSelectedChain: isOgunAvailable(selectedChainId),
    web3ForSelectedChain: web3Instances[selectedChainId] || null,
  }

  return (
    <MultiChainContext.Provider value={value}>
      {children}
    </MultiChainContext.Provider>
  )
}

export const useMultiChain = () => useContext(MultiChainContext)

export default MultiChainProvider
