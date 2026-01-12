/**
 * useMultiWalletConnections - Hybrid Multi-Chain Wallet Manager
 *
 * Manages connections to multiple wallet types simultaneously:
 * - MetaMask (browser extension)
 * - Coinbase Wallet (browser extension + mobile)
 * - WalletConnect v2 (300+ mobile wallets)
 * - Phantom (Solana)
 *
 * This is the core hook that makes SoundChain the only hybrid
 * wallet connection platform in Web3 music.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Web3 from 'web3'
import { config } from 'config'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import { ConnectedWallet, WalletNFT, CHAIN_CONFIG } from 'components/dex/ConnectedWalletsPanel'

// Storage keys for persisting connections
const STORAGE_KEY = 'soundchain_multi_wallet_connections'

interface WalletConnection {
  address: string
  chainId: number
  chainKey: string
  walletType: 'metamask' | 'coinbase' | 'walletconnect' | 'phantom'
}

interface UseMultiWalletConnectionsReturn {
  // Connected wallets state
  connectedWallets: ConnectedWallet[]

  // Connection functions
  connectMetaMask: () => Promise<void>
  connectCoinbaseWallet: () => Promise<void>
  connectWalletConnect: () => Promise<void>
  connectPhantom: () => Promise<void>

  // Disconnect functions
  disconnectWallet: (walletId: string) => Promise<void>
  disconnectAll: () => Promise<void>

  // State
  isConnecting: boolean
  connectingWallet: string | null
  error: string | null
  clearError: () => void

  // Refresh
  refreshBalances: () => Promise<void>
  refreshNFTs: (walletId: string) => Promise<void>
}

// Chain ID to chain key mapping
const chainIdToKey: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  8453: 'base',
  7000: 'zetachain',
  42161: 'arbitrum',
}

// Get OGUN balance (only works on Polygon)
async function getOgunBalance(web3: Web3, address: string): Promise<string> {
  try {
    const chainId = await web3.eth.getChainId()
    if (Number(chainId) !== 137 || !config.ogunTokenAddress) return '0'

    const contract = new web3.eth.Contract(
      SoundchainOGUN20.abi as AbiItem[],
      config.ogunTokenAddress
    )
    const balance = await contract.methods.balanceOf(address).call() as string | bigint | undefined
    const validBalance = typeof balance === 'bigint' ? balance.toString() : String(balance || '0')
    return Number(web3.utils.fromWei(validBalance, 'ether')).toFixed(4)
  } catch {
    return '0'
  }
}

export function useMultiWalletConnections(): UseMultiWalletConnectionsReturn {
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const walletConnectProviderRef = useRef<any>(null)
  const coinbaseProviderRef = useRef<any>(null)

  // Load saved connections on mount
  useEffect(() => {
    const loadSavedConnections = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const connections: WalletConnection[] = JSON.parse(saved)
          // Attempt to reconnect saved wallets
          for (const conn of connections) {
            await reconnectWallet(conn)
          }
        }
      } catch (err) {
        console.error('Failed to load saved wallet connections:', err)
      }
    }

    loadSavedConnections()
  }, [])

  // Save connections to localStorage
  const saveConnections = useCallback((wallets: ConnectedWallet[]) => {
    const connections: WalletConnection[] = wallets.map(w => ({
      address: w.address,
      chainId: CHAIN_CONFIG[w.chainKey]?.id || 137,
      chainKey: w.chainKey,
      walletType: w.walletType as any,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections))
  }, [])

  // Reconnect a previously connected wallet
  const reconnectWallet = useCallback(async (conn: WalletConnection) => {
    // Implementation depends on wallet type
    // For now, just log - full reconnect requires checking if wallet is still available
    console.log('Attempting to reconnect:', conn.walletType, conn.address)
  }, [])

  // Add a wallet to the connected list
  const addWallet = useCallback(async (
    address: string,
    chainId: number,
    walletType: 'metamask' | 'coinbase' | 'walletconnect' | 'phantom',
    web3?: Web3
  ) => {
    const chainKey = chainIdToKey[chainId] || 'polygon'
    const walletId = `${walletType}-${chainKey}-${address.slice(-8)}`

    // Check if already connected
    const existing = connectedWallets.find(w => w.address.toLowerCase() === address.toLowerCase())
    if (existing) {
      console.log('Wallet already connected:', address)
      return
    }

    // Get balance
    let balance = '0'
    if (web3) {
      try {
        const wei = await web3.eth.getBalance(address)
        balance = Number(web3.utils.fromWei(wei, 'ether')).toFixed(4)
      } catch (err) {
        console.error('Failed to get balance:', err)
      }
    }

    const newWallet: ConnectedWallet = {
      id: walletId,
      address,
      chainKey,
      balance,
      nftCount: 0,
      nfts: [],
      walletType,
      isActive: false,
    }

    setConnectedWallets(prev => {
      const updated = [...prev, newWallet]
      saveConnections(updated)
      return updated
    })

    // Fetch NFTs in background
    // This would call your GraphQL endpoint
    console.log('Wallet connected:', walletType, address, chainKey)
  }, [connectedWallets, saveConnections])

  // Connect MetaMask
  const connectMetaMask = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not installed. Please install MetaMask extension.')
      return
    }

    setIsConnecting(true)
    setConnectingWallet('metamask')
    setError(null)

    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask')
      }

      const address = accounts[0]
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)

      const web3 = new Web3(window.ethereum as any)
      await addWallet(address, chainId, 'metamask', web3)

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          // Disconnected
          setConnectedWallets(prev => prev.filter(w => w.walletType !== 'metamask'))
        } else {
          // Account changed - update
          const chainId = parseInt(window.ethereum.chainId || '0x89', 16)
          addWallet(newAccounts[0], chainId, 'metamask', new Web3(window.ethereum))
        }
      })

      // Listen for chain changes
      window.ethereum.on('chainChanged', async () => {
        const newChainId = parseInt(window.ethereum.chainId || '0x89', 16)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts[0]) {
          // Update wallet with new chain
          setConnectedWallets(prev => {
            const updated = prev.map(w => {
              if (w.walletType === 'metamask') {
                return { ...w, chainKey: chainIdToKey[newChainId] || 'polygon' }
              }
              return w
            })
            saveConnections(updated)
            return updated
          })
        }
      })
    } catch (err: any) {
      console.error('MetaMask connection error:', err)
      setError(err.message || 'Failed to connect MetaMask')
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }, [addWallet, saveConnections])

  // Connect Coinbase Wallet
  const connectCoinbaseWallet = useCallback(async () => {
    setIsConnecting(true)
    setConnectingWallet('coinbase')
    setError(null)

    try {
      // Check for Coinbase Wallet extension
      const coinbaseWallet = (window as any).coinbaseWalletExtension

      if (coinbaseWallet) {
        // Use extension
        const accounts = await coinbaseWallet.request({ method: 'eth_requestAccounts' })
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts returned from Coinbase Wallet')
        }

        const address = accounts[0]
        const chainIdHex = await coinbaseWallet.request({ method: 'eth_chainId' })
        const chainId = parseInt(chainIdHex, 16)

        const web3 = new Web3(coinbaseWallet)
        coinbaseProviderRef.current = coinbaseWallet

        await addWallet(address, chainId, 'coinbase', web3)
      } else {
        // Use Coinbase Wallet SDK for mobile
        const { CoinbaseWalletSDK } = await import('@coinbase/wallet-sdk')

        const coinbaseWalletSDK = new CoinbaseWalletSDK({
          appName: 'SoundChain',
          appLogoUrl: 'https://soundchain.io/logo.png',
        })

        const provider = coinbaseWalletSDK.makeWeb3Provider()
        coinbaseProviderRef.current = provider

        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts returned from Coinbase Wallet')
        }

        const address = accounts[0]
        const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string
        const chainId = parseInt(chainIdHex, 16)

        const web3 = new Web3(provider as any)
        await addWallet(address, chainId, 'coinbase', web3)
      }
    } catch (err: any) {
      console.error('Coinbase Wallet connection error:', err)
      setError(err.message || 'Failed to connect Coinbase Wallet')
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }, [addWallet])

  // Connect WalletConnect v2
  const connectWalletConnect = useCallback(async () => {
    setIsConnecting(true)
    setConnectingWallet('walletconnect')
    setError(null)

    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      // WalletConnect Project ID - get yours at https://cloud.walletconnect.com/
      const projectId = (config as any).walletConnectProjectId || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

      const provider = await EthereumProvider.init({
        projectId,
        chains: [137], // Polygon as primary
        optionalChains: [1, 8453, 42161, 7000], // ETH, Base, Arbitrum, ZetaChain
        showQrModal: true,
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/logo.png'],
        },
      })

      walletConnectProviderRef.current = provider

      // Connect - this shows the QR modal
      await provider.connect()

      const accounts = provider.accounts
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from WalletConnect')
      }

      const address = accounts[0]
      const chainId = provider.chainId

      const web3 = new Web3(provider as any)
      await addWallet(address, chainId, 'walletconnect', web3)

      // Listen for events
      provider.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setConnectedWallets(prev => prev.filter(w => w.walletType !== 'walletconnect'))
        }
      })

      provider.on('disconnect', () => {
        setConnectedWallets(prev => prev.filter(w => w.walletType !== 'walletconnect'))
        walletConnectProviderRef.current = null
      })
    } catch (err: any) {
      console.error('WalletConnect connection error:', err)
      if (err.message?.includes('User rejected')) {
        setError('Connection rejected by user')
      } else {
        setError(err.message || 'Failed to connect via WalletConnect')
      }
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }, [addWallet])

  // Connect Phantom (Solana)
  const connectPhantom = useCallback(async () => {
    setIsConnecting(true)
    setConnectingWallet('phantom')
    setError(null)

    try {
      const phantom = (window as any).solana

      if (!phantom?.isPhantom) {
        setError('Phantom wallet not installed. Please install Phantom extension.')
        return
      }

      const response = await phantom.connect()
      const address = response.publicKey.toString()

      // Solana uses different chain ID
      const newWallet: ConnectedWallet = {
        id: `phantom-solana-${address.slice(-8)}`,
        address,
        chainKey: 'solana',
        balance: '0', // Would need Solana connection for balance
        nftCount: 0,
        nfts: [],
        walletType: 'phantom',
        isActive: false,
      }

      setConnectedWallets(prev => {
        const updated = [...prev, newWallet]
        saveConnections(updated)
        return updated
      })

      // Get SOL balance - optional, requires @solana/web3.js to be installed
      // Skip for now - can be enabled when Solana SDK is added
      // Balance will show as 0 until then
      console.log('SOL balance fetch skipped - install @solana/web3.js to enable')

      // Listen for disconnect
      phantom.on('disconnect', () => {
        setConnectedWallets(prev => prev.filter(w => w.walletType !== 'phantom'))
      })
    } catch (err: any) {
      console.error('Phantom connection error:', err)
      setError(err.message || 'Failed to connect Phantom')
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }, [saveConnections])

  // Disconnect a wallet
  const disconnectWallet = useCallback(async (walletId: string) => {
    const wallet = connectedWallets.find(w => w.id === walletId)
    if (!wallet) return

    // Disconnect based on wallet type
    try {
      if (wallet.walletType === 'walletconnect' && walletConnectProviderRef.current) {
        await walletConnectProviderRef.current.disconnect()
        walletConnectProviderRef.current = null
      } else if (wallet.walletType === 'coinbase' && coinbaseProviderRef.current) {
        // Coinbase doesn't have a disconnect method, just clear reference
        coinbaseProviderRef.current = null
      } else if (wallet.walletType === 'phantom') {
        const phantom = (window as any).solana
        if (phantom) await phantom.disconnect()
      }
      // MetaMask doesn't support programmatic disconnect
    } catch (err) {
      console.error('Error disconnecting wallet:', err)
    }

    setConnectedWallets(prev => {
      const updated = prev.filter(w => w.id !== walletId)
      saveConnections(updated)
      return updated
    })
  }, [connectedWallets, saveConnections])

  // Disconnect all wallets
  const disconnectAll = useCallback(async () => {
    for (const wallet of connectedWallets) {
      await disconnectWallet(wallet.id)
    }
  }, [connectedWallets, disconnectWallet])

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    // Implementation would refresh balances for all connected wallets
    console.log('Refreshing balances for all wallets...')
  }, [])

  // Refresh NFTs for a specific wallet
  const refreshNFTs = useCallback(async (walletId: string) => {
    // Implementation would fetch NFTs from your GraphQL endpoint
    console.log('Refreshing NFTs for wallet:', walletId)
  }, [])

  return {
    connectedWallets,
    connectMetaMask,
    connectCoinbaseWallet,
    connectWalletConnect,
    connectPhantom,
    disconnectWallet,
    disconnectAll,
    isConnecting,
    connectingWallet,
    error,
    clearError,
    refreshBalances,
    refreshNFTs,
  }
}

export default useMultiWalletConnections
