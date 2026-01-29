/**
 * WalletSelector - Universal Wallet Connection Interface
 *
 * SoundChain's Web3 interface layer. Users connect ANY wallet and perform
 * blockchain actions (mint, stake, transfer) through our UI.
 *
 * Supported wallets:
 * - SoundChain (Magic OAuth) - Default, no extension needed
 * - MetaMask - Browser extension
 * - Coinbase Wallet - Extension + Mobile
 * - WalletConnect - 300+ mobile wallets (Rainbow, Trust, etc.)
 * - Phantom - Solana (coming soon)
 *
 * Integrates with UnifiedWalletContext for global state management.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import classNames from 'classnames'
import { Matic } from 'components/Matic'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import { Ogun } from '../Ogun'
import { ChevronDown, Check, Loader2, Plus, X, Wallet, ExternalLink, Copy } from 'lucide-react'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { config } from 'config'
import SoundchainOGUN20 from '../../contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'

// Pre-load WalletConnect SDK — MUST be lazy (not top-level) to avoid webpack TDZ crash
let wcProviderModule: any = null
let wcPreloadStarted = false

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '53a9f7ff48d78a81624b5333d52b9123'

// WalletConnect modal config for faster loading
const WC_MODAL_CONFIG = {
  // Featured wallets shown immediately without API fetch
  explorerRecommendedWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
  ],
  // Disable extra features for faster modal render
  explorerExcludedWalletIds: 'ALL' as const, // Only show featured + installed
}

// Wallet type definitions
type WalletType = 'soundchain' | 'metamask' | 'coinbase' | 'walletconnect' | 'phantom'

interface ConnectedWalletInfo {
  type: WalletType
  address: string
  balance: string
  ogunBalance?: string
  chainId: number
  chainName: string
}

// Mobile detection
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Deep links for mobile wallet apps
const getWalletDeepLink = (walletId: string, wcUri?: string) => {
  const encodedUri = wcUri ? encodeURIComponent(wcUri) : ''
  switch (walletId) {
    case 'metamask':
      return wcUri
        ? `https://metamask.app.link/wc?uri=${encodedUri}`
        : `https://metamask.app.link/dapp/${typeof window !== 'undefined' ? window.location.host : 'soundchain.fm'}`
    case 'coinbase':
      return wcUri
        ? `https://go.cb-w.com/wc?uri=${encodedUri}`
        : `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent('https://soundchain.fm')}`
    case 'rainbow':
      return wcUri
        ? `https://rainbow.me/wc?uri=${encodedUri}`
        : `https://rainbow.me`
    case 'trust':
      return wcUri
        ? `https://link.trustwallet.com/wc?uri=${encodedUri}`
        : `https://link.trustwallet.com/open_url?url=${encodeURIComponent('https://soundchain.fm')}`
    case 'phantom':
      return `https://phantom.app/ul/browse/${encodeURIComponent('https://soundchain.fm')}`
    default:
      return null
  }
}

// Wallet configurations
const WALLET_CONFIG: Record<WalletType, { name: string; icon: string; color: string; description: string; mobileDescription: string }> = {
  soundchain: {
    name: 'SoundChain',
    icon: '✨',
    color: 'from-cyan-500 to-purple-500',
    description: 'No extension needed',
    mobileDescription: 'Built-in wallet',
  },
  metamask: {
    name: 'MetaMask',
    icon: '🦊',
    color: 'from-orange-500 to-orange-600',
    description: 'Extension or mobile app',
    mobileDescription: 'Open MetaMask app',
  },
  coinbase: {
    name: 'Coinbase',
    icon: '🔵',
    color: 'from-blue-500 to-blue-600',
    description: 'Extension or mobile app',
    mobileDescription: 'Open Coinbase app',
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: '🔗',
    color: 'from-blue-400 to-purple-500',
    description: '300+ mobile wallets',
    mobileDescription: 'Rainbow, Trust & more',
  },
  phantom: {
    name: 'Phantom',
    icon: '👻',
    color: 'from-purple-500 to-purple-600',
    description: 'Extension or mobile app',
    mobileDescription: 'Open Phantom app',
  },
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  7000: 'ZetaChain',
  80002: 'Amoy',
}

interface WalletSelectorProps {
  className?: string
  ownerAddressAccount?: string
  showOgun?: boolean
  onWalletChange?: (address: string, walletType: WalletType) => void
}

export const WalletSelector = ({ className, ownerAddressAccount, showOgun = false, onWalletChange }: WalletSelectorProps) => {
  // Pre-load WalletConnect SDK on first mount (moved from module scope to avoid TDZ)
  useEffect(() => {
    if (!wcPreloadStarted && typeof window !== 'undefined') {
      wcPreloadStarted = true
      import('@walletconnect/ethereum-provider').then(mod => {
        wcProviderModule = mod
        console.log('⚡ WalletConnect SDK pre-loaded')
      }).catch(() => {})
    }
  }, [])

  const me = useMe()
  const { account: magicAccount, balance: magicBalance, ogunBalance: magicOgunBalance } = useMagicContext()
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation()

  // Unified wallet context for global state sync
  const {
    setDirectConnection,
    switchToMagic,
    activeWalletType: unifiedActiveType,
    activeAddress: unifiedActiveAddress,
    activeBalance: unifiedActiveBalance,
    directWalletSubtype,
    chainId: unifiedChainId,
    registerExternalWallet,
  } = useUnifiedWallet()

  // Connected external wallets
  const [externalWallets, setExternalWallets] = useState<ConnectedWalletInfo[]>([])
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('soundchain')
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [showConnectMenu, setShowConnectMenu] = useState(false)
  const [isConnecting, setIsConnecting] = useState<WalletType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Scroll guard: prevent accidental wallet connect on mobile scroll release
  const touchStartY = useRef(0)
  const isScrolling = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isScrolling.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (Math.abs(e.touches[0].clientY - touchStartY.current) > 10) {
      isScrolling.current = true
    }
  }

  // Sync with UnifiedWalletContext - detect external wallet connections
  useEffect(() => {
    if (unifiedActiveType === 'magic') {
      setSelectedWallet('soundchain')
    } else if (unifiedActiveType === 'metamask') {
      setSelectedWallet('metamask')
      // Auto-add MetaMask to external wallets if connected via context
      if (unifiedActiveAddress) {
        setExternalWallets(prev => {
          if (prev.some(w => w.type === 'metamask')) return prev
          return [...prev, {
            type: 'metamask' as WalletType,
            address: unifiedActiveAddress,
            balance: unifiedActiveBalance || '0',
            chainId: unifiedChainId || 137,
            chainName: CHAIN_NAMES[unifiedChainId || 137] || 'Polygon',
          }]
        })
      }
    } else if (unifiedActiveType === 'direct' && unifiedActiveAddress) {
      // External wallet connected via WalletConnectButton or other external source
      const walletType: WalletType = (directWalletSubtype === 'metamask' || directWalletSubtype === 'coinbase' ||
        directWalletSubtype === 'walletconnect' || directWalletSubtype === 'phantom')
        ? directWalletSubtype as WalletType
        : 'walletconnect'

      const chainId = unifiedChainId || 137

      // Auto-add to external wallets if not already present (by type)
      setExternalWallets(prev => {
        if (prev.some(w => w.type === walletType)) return prev // prevent re-entry
        return [...prev, {
          type: walletType,
          address: unifiedActiveAddress,
          balance: unifiedActiveBalance || '0',
          chainId,
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        }]
      })

      setSelectedWallet(walletType)
    }
  }, [unifiedActiveType, unifiedActiveAddress, unifiedActiveBalance, directWalletSubtype, unifiedChainId])

  // Sync external wallets to UnifiedWalletContext registry (for MultiWalletAggregator)
  useEffect(() => {
    for (const w of externalWallets) {
      registerExternalWallet({
        address: w.address,
        walletType: w.type,
        chainId: w.chainId || 137,
        chainName: w.chainName || 'Polygon',
        balance: w.balance || '0',
        ogunBalance: w.ogunBalance || '0',
      })
    }
  }, [externalWallets, registerExternalWallet])

  // Fetch OGUN balance for external wallets on Polygon
  const fetchOgunBalance = useCallback(async (address: string): Promise<string> => {
    try {
      const web3 = new Web3('https://rpc.ankr.com/polygon')
      const contract = new web3.eth.Contract(SoundchainOGUN20.abi as AbiItem[], config.ogunTokenAddress as string)
      const rawBalance = await contract.methods.balanceOf(address).call() as string | undefined
      const valid = rawBalance !== undefined && (typeof rawBalance === 'string' || typeof rawBalance === 'number')
        ? rawBalance.toString()
        : '0'
      return web3.utils.fromWei(valid, 'ether')
    } catch {
      return '0'
    }
  }, [])

  // Auto-fetch OGUN balance for all external EVM wallets
  // OGUN is on Polygon, but EVM addresses are the same across chains - fetch via public RPC
  useEffect(() => {
    const fetchAll = async () => {
      const updated = await Promise.all(
        externalWallets.map(async (w) => {
          if (w.ogunBalance !== undefined) return w // already fetched
          if (w.type === 'phantom') return w // Solana - different address
          const ogunBalance = await fetchOgunBalance(w.address)
          return { ...w, ogunBalance }
        })
      )
      if (updated.some((w, i) => w.ogunBalance !== externalWallets[i].ogunBalance)) {
        setExternalWallets(updated)
      }
    }
    if (externalWallets.length > 0) {
      fetchAll()
    }
  }, [externalWallets.length, fetchOgunBalance])

  // Copy wallet address to clipboard
  const copyAddress = useCallback((address: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // Load saved wallet preference
  useEffect(() => {
    const saved = localStorage.getItem('soundchain_selected_wallet')
    if (saved && (saved === 'soundchain' || externalWallets.some(w => w.type === saved))) {
      setSelectedWallet(saved as WalletType)
    }
  }, [externalWallets])

  // Get current wallet info
  const getCurrentWallet = useCallback((): ConnectedWalletInfo | null => {
    if (selectedWallet === 'soundchain' && magicAccount) {
      return {
        type: 'soundchain',
        address: magicAccount,
        balance: magicBalance || '0',
        chainId: 137,
        chainName: 'Polygon',
      }
    }
    return externalWallets.find(w => w.type === selectedWallet) || null
  }, [selectedWallet, magicAccount, magicBalance, externalWallets])

  const currentWallet = getCurrentWallet()

  // Select a wallet
  const handleSelectWallet = useCallback((type: WalletType) => {
    setSelectedWallet(type)
    localStorage.setItem('soundchain_selected_wallet', type)
    setShowWalletMenu(false)

    // Update backend preference
    if (type === 'soundchain') {
      updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.Soundchain } } })
      // Sync with UnifiedWalletContext
      switchToMagic()
    } else if (type === 'metamask') {
      updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.MetaMask } } })
      // Sync with UnifiedWalletContext - find the MetaMask wallet info
      const mmWallet = externalWallets.find(w => w.type === 'metamask')
      if (mmWallet) {
        setDirectConnection(mmWallet.address, 'metamask', mmWallet.chainId)
      }
    } else {
      // For other wallets (Coinbase, WalletConnect, Phantom), sync to context
      const extWallet = externalWallets.find(w => w.type === type)
      if (extWallet) {
        setDirectConnection(extWallet.address, type, extWallet.chainId)
      }
    }

    // Notify parent
    const wallet = type === 'soundchain'
      ? { address: magicAccount || '', type }
      : externalWallets.find(w => w.type === type)
    if (wallet && onWalletChange) {
      onWalletChange(wallet.address, type)
    }
  }, [magicAccount, externalWallets, updateDefaultWallet, onWalletChange, switchToMagic, setDirectConnection])

  // Find the MetaMask provider (handles multiple wallet extensions via EIP-5749)
  const getMetaMaskProvider = () => {
    if (typeof window === 'undefined' || !window.ethereum) return null
    // Multiple extensions: check providers array
    if (window.ethereum.providers?.length) {
      const mm = window.ethereum.providers.find((p: any) => p.isMetaMask && !p.isCoinbaseWallet)
      if (mm) return mm
    }
    // Single extension: check directly
    if (window.ethereum.isMetaMask && !(window.ethereum as any).isCoinbaseWallet) {
      return window.ethereum
    }
    return null
  }

  // Connect MetaMask (Desktop extension OR Mobile via WalletConnect deep link)
  const connectMetaMask = useCallback(async () => {
    if (isScrolling.current) return
    const mobile = isMobile()
    const mmProvider = getMetaMaskProvider()

    // MOBILE: Use WalletConnect with MetaMask deep link
    if (mobile && !mmProvider) {
      setIsConnecting('metamask')
      setError(null)

      try {
        const mod = wcProviderModule || await import('@walletconnect/ethereum-provider')
        const { EthereumProvider } = mod

        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          chains: [137],
          optionalChains: [1, 8453, 42161],
          showQrModal: false, // Don't show QR - we'll use deep link
          metadata: {
            name: 'SoundChain',
            description: 'Web3 Music Platform',
            url: 'https://soundchain.fm',
            icons: ['https://soundchain.fm/logo.png'],
          },
        })

        // Get URI and open MetaMask mobile app
        provider.on('display_uri', (uri: string) => {
          const deepLink = getWalletDeepLink('metamask', uri)
          if (deepLink) {
            window.open(deepLink, '_blank')
          }
        })

        await provider.connect()

        const accounts = provider.accounts
        if (!accounts?.[0]) throw new Error('No account')

        const chainId = provider.chainId
        const web3 = new Web3(provider as any)
        const balance = await web3.eth.getBalance(accounts[0])

        const newWallet: ConnectedWalletInfo = {
          type: 'metamask',
          address: accounts[0],
          balance: Number(web3.utils.fromWei(balance, 'ether')).toFixed(4),
          chainId,
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        }

        setExternalWallets(prev => {
          const filtered = prev.filter(w => w.type !== 'metamask')
          return [...filtered, newWallet]
        })
        setSelectedWallet('metamask')
        setShowConnectMenu(false)
        setDirectConnection(accounts[0], 'metamask', chainId)

        provider.on('disconnect', () => {
          setExternalWallets(prev => prev.filter(w => w.type !== 'metamask'))
          setSelectedWallet('soundchain')
          switchToMagic()
        })
      } catch (err: any) {
        if (!err.message?.includes('User rejected')) {
          setError(err.message || 'Failed to connect MetaMask mobile')
        }
      } finally {
        setIsConnecting(null)
      }
      return
    }

    // DESKTOP: Use browser extension (find MetaMask specifically among multiple wallets)
    if (!mmProvider) {
      setError('MetaMask not detected - get it at metamask.io')
      return
    }

    setIsConnecting('metamask')
    setError(null)

    try {
      const accounts = await mmProvider.request({ method: 'eth_requestAccounts' })
      if (!accounts?.[0]) throw new Error('No account')

      const chainIdHex = await mmProvider.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex as string, 16)
      const web3 = new Web3(mmProvider as any)
      const balance = await web3.eth.getBalance(accounts[0])

      const newWallet: ConnectedWalletInfo = {
        type: 'metamask',
        address: accounts[0],
        balance: Number(web3.utils.fromWei(balance, 'ether')).toFixed(4),
        chainId,
        chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      }

      setExternalWallets(prev => {
        const filtered = prev.filter(w => w.type !== 'metamask')
        return [...filtered, newWallet]
      })
      setSelectedWallet('metamask')
      setShowConnectMenu(false)

      // Sync with UnifiedWalletContext for global state
      setDirectConnection(accounts[0], 'metamask', chainId)

      // Listen for changes on MetaMask provider specifically
      mmProvider.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setExternalWallets(prev => prev.filter(w => w.type !== 'metamask'))
          setSelectedWallet('soundchain')
          switchToMagic()
        } else {
          setDirectConnection(newAccounts[0], 'metamask', chainId)
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
    } finally {
      setIsConnecting(null)
    }
  }, [setDirectConnection, switchToMagic])

  // Connect Coinbase Wallet
  const connectCoinbase = useCallback(async () => {
    if (isScrolling.current) return
    setIsConnecting('coinbase')
    setError(null)

    try {
      // Check for extension first
      const coinbaseWallet = (window as any).coinbaseWalletExtension

      if (coinbaseWallet) {
        const accounts = await coinbaseWallet.request({ method: 'eth_requestAccounts' })
        if (!accounts?.[0]) throw new Error('No account')

        const chainIdHex = await coinbaseWallet.request({ method: 'eth_chainId' })
        const chainId = parseInt(chainIdHex, 16)
        const web3 = new Web3(coinbaseWallet)
        const balance = await web3.eth.getBalance(accounts[0])

        const newWallet: ConnectedWalletInfo = {
          type: 'coinbase',
          address: accounts[0],
          balance: Number(web3.utils.fromWei(balance, 'ether')).toFixed(4),
          chainId,
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        }

        setExternalWallets(prev => {
          const filtered = prev.filter(w => w.type !== 'coinbase')
          return [...filtered, newWallet]
        })
        setSelectedWallet('coinbase')
        setShowConnectMenu(false)
        // Sync with UnifiedWalletContext
        setDirectConnection(accounts[0], 'coinbase', chainId)
      } else {
        // Use Coinbase Wallet SDK for mobile
        const { CoinbaseWalletSDK } = await import('@coinbase/wallet-sdk')
        const sdk = new CoinbaseWalletSDK({ appName: 'SoundChain' })
        const provider = sdk.makeWeb3Provider()

        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
        if (!accounts?.[0]) throw new Error('No account')

        const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string
        const chainId = parseInt(chainIdHex, 16)
        const web3 = new Web3(provider as any)
        const balance = await web3.eth.getBalance(accounts[0])

        const newWallet: ConnectedWalletInfo = {
          type: 'coinbase',
          address: accounts[0],
          balance: Number(web3.utils.fromWei(balance, 'ether')).toFixed(4),
          chainId,
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        }

        setExternalWallets(prev => {
          const filtered = prev.filter(w => w.type !== 'coinbase')
          return [...filtered, newWallet]
        })
        setSelectedWallet('coinbase')
        setShowConnectMenu(false)
        // Sync with UnifiedWalletContext
        setDirectConnection(accounts[0], 'coinbase', chainId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Coinbase')
    } finally {
      setIsConnecting(null)
    }
  }, [setDirectConnection])

  // Connect WalletConnect (Rainbow, Trust, 300+ wallets)
  const connectWalletConnect = useCallback(async () => {
    if (isScrolling.current) return
    setIsConnecting('walletconnect')
    setError(null)

    try {
      // Use pre-loaded module or dynamic import as fallback
      const mod = wcProviderModule || await import('@walletconnect/ethereum-provider')
      const { EthereumProvider } = mod

      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [137],
        optionalChains: [1, 8453, 42161, 7000], // Polygon, Ethereum, Base, Arbitrum, ZetaChain
        showQrModal: true,
        qrModalOptions: {
          explorerRecommendedWalletIds: WC_MODAL_CONFIG.explorerRecommendedWalletIds,
          explorerExcludedWalletIds: WC_MODAL_CONFIG.explorerExcludedWalletIds,
        },
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.fm',
          icons: ['https://soundchain.fm/logo.png'],
        },
      })

      await provider.connect()

      const accounts = provider.accounts
      if (!accounts?.[0]) throw new Error('No account')

      const chainId = provider.chainId
      const web3 = new Web3(provider as any)
      const balance = await web3.eth.getBalance(accounts[0])

      const newWallet: ConnectedWalletInfo = {
        type: 'walletconnect',
        address: accounts[0],
        balance: Number(web3.utils.fromWei(balance, 'ether')).toFixed(4),
        chainId,
        chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      }

      setExternalWallets(prev => {
        const filtered = prev.filter(w => w.type !== 'walletconnect')
        return [...filtered, newWallet]
      })
      setSelectedWallet('walletconnect')
      setShowConnectMenu(false)

      // Sync with UnifiedWalletContext
      setDirectConnection(accounts[0], 'walletconnect', chainId)

      provider.on('disconnect', () => {
        setExternalWallets(prev => prev.filter(w => w.type !== 'walletconnect'))
        setSelectedWallet('soundchain')
        switchToMagic() // Switch back to Magic wallet
      })
    } catch (err: any) {
      if (!err.message?.includes('User rejected')) {
        setError(err.message || 'Failed to connect')
      }
    } finally {
      setIsConnecting(null)
    }
  }, [setDirectConnection, switchToMagic])

  // Connect Phantom (Solana) - Desktop extension OR Mobile deep link
  const connectPhantom = useCallback(async () => {
    if (isScrolling.current) return
    const mobile = isMobile()
    const hasExtension = typeof window !== 'undefined' && (window as any).solana?.isPhantom

    // MOBILE: Open Phantom app via deep link
    if (mobile && !hasExtension) {
      const deepLink = getWalletDeepLink('phantom')
      if (deepLink) {
        window.open(deepLink, '_blank')
      }
      return
    }

    setIsConnecting('phantom')
    setError(null)

    try {
      const phantom = (window as any).solana
      if (!phantom?.isPhantom) {
        setError('Phantom not installed - get it at phantom.app')
        return
      }

      const response = await phantom.connect()
      const address = response.publicKey.toString()

      const newWallet: ConnectedWalletInfo = {
        type: 'phantom',
        address,
        balance: '0', // TODO: Fetch SOL balance when SDK installed
        chainId: -1,
        chainName: 'Solana',
      }

      setExternalWallets(prev => {
        const filtered = prev.filter(w => w.type !== 'phantom')
        return [...filtered, newWallet]
      })
      setSelectedWallet('phantom')
      setShowConnectMenu(false)

      // Sync with UnifiedWalletContext (Solana uses chainId -1)
      setDirectConnection(address, 'phantom', -1)

      phantom.on('disconnect', () => {
        setExternalWallets(prev => prev.filter(w => w.type !== 'phantom'))
        setSelectedWallet('soundchain')
        switchToMagic() // Switch back to Magic wallet
      })
    } catch (err: any) {
      setError(err.message || 'Failed to connect Phantom')
    } finally {
      setIsConnecting(null)
    }
  }, [setDirectConnection, switchToMagic])

  // Disconnect a wallet
  const disconnectWallet = useCallback((type: WalletType) => {
    setExternalWallets(prev => prev.filter(w => w.type !== type))
    if (selectedWallet === type) {
      setSelectedWallet('soundchain')
      switchToMagic() // Switch back to Magic wallet in context
    }
  }, [selectedWallet, switchToMagic])

  // Format address
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Get available wallets to connect
  const availableWallets = (['metamask', 'coinbase', 'walletconnect', 'phantom'] as WalletType[])
    .filter(type => !externalWallets.some(w => w.type === type))

  // All connected wallets for selection
  const allWallets: { type: WalletType; info: ConnectedWalletInfo | null }[] = [
    { type: 'soundchain', info: magicAccount ? { type: 'soundchain', address: magicAccount, balance: magicBalance || '0', chainId: 137, chainName: 'Polygon' } : null },
    ...externalWallets.map(w => ({ type: w.type, info: w })),
  ].filter(w => w.info !== null)

  return (
    <div className={classNames('bg-gray-900/80 backdrop-blur-sm rounded-xl border border-white/10', className)}>
      <div className="p-3 sm:p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Wallet</span>
          </div>

          {/* Add Wallet Button */}
          {availableWallets.length > 0 && (
            <button
              onClick={() => setShowConnectMenu(!showConnectMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/20 active:bg-cyan-500/30 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>

        {/* Current Wallet Display */}
        {currentWallet && (
          <button
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            className="w-full flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10 hover:border-cyan-500/50 active:border-cyan-500 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Wallet Icon */}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${WALLET_CONFIG[currentWallet.type].color} flex items-center justify-center text-lg shadow-lg`}>
                {currentWallet.type === 'soundchain' ? (
                  <Logo id="wallet-icon" height="20" width="20" />
                ) : (
                  WALLET_CONFIG[currentWallet.type].icon
                )}
              </div>

              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{WALLET_CONFIG[currentWallet.type].name}</span>
                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{currentWallet.chainName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <code className="text-xs text-cyan-400 font-mono truncate max-w-[180px] sm:max-w-none">{currentWallet.address}</code>
                  <button
                    onClick={(e) => copyAddress(currentWallet.address, e)}
                    className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <Matic value={currentWallet.balance} />
                {showOgun && currentWallet.type === 'soundchain' && (
                  <Ogun value={magicOgunBalance} className="text-xs" />
                )}
                {showOgun && currentWallet.type !== 'soundchain' && currentWallet.ogunBalance && Number(currentWallet.ogunBalance) > 0 && (
                  <Ogun value={currentWallet.ogunBalance} className="text-xs" />
                )}
                {showOgun && currentWallet.type !== 'soundchain' && (!currentWallet.ogunBalance || Number(currentWallet.ogunBalance) === 0) && currentWallet.chainId === 137 && (
                  <span className="text-[10px] text-gray-600">0 OGUN</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
            </div>
          </button>
        )}

        {/* No Wallet Connected */}
        {!currentWallet && !magicAccount && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No wallet connected
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <span className="text-xs text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Wallet Selection Menu - Mobile Bottom Sheet */}
      {showWalletMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 [touch-action:none]" onClick={() => setShowWalletMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 sm:fixed sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] sm:max-w-[90vw] bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[80dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-action-pan-y pb-8 sm:pb-0">
            <div className="p-2 border-b border-gray-800 sm:hidden">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto" />
            </div>

            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Select Wallet</p>
                <button onClick={() => setShowWalletMenu(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {allWallets.map(({ type, info }) => info && (
                <button
                  key={type}
                  onClick={() => handleSelectWallet(type)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                    selectedWallet === type
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'hover:bg-white/5 active:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${WALLET_CONFIG[type].color} flex items-center justify-center text-lg`}>
                      {type === 'soundchain' ? <Logo id={`wallet-${type}`} height="20" width="20" /> : WALLET_CONFIG[type].icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{WALLET_CONFIG[type].name}</span>
                        <span className="text-[10px] text-gray-500">{info.chainName}</span>
                      </div>
                      <code className="text-xs text-gray-400 font-mono">{formatAddress(info.address)}</code>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-white font-medium">
                        {Number(info.balance).toFixed(4)} {info.chainId === 137 ? 'POL' : info.chainId === 1 ? 'ETH' : 'POL'}
                      </div>
                      {type === 'soundchain' && magicOgunBalance ? (
                        <div className="text-[10px] text-cyan-400">{Number(magicOgunBalance).toFixed(2)} OGUN</div>
                      ) : info.ogunBalance && Number(info.ogunBalance) > 0 ? (
                        <div className="text-[10px] text-cyan-400">{Number(info.ogunBalance).toFixed(2)} OGUN</div>
                      ) : info.chainId === 137 ? (
                        <div className="text-[10px] text-gray-600">0 OGUN</div>
                      ) : null}
                    </div>
                    {selectedWallet === type && <Check className="w-4 h-4 text-cyan-400" />}
                    {type !== 'soundchain' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); disconnectWallet(type) }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Connect More */}
            {availableWallets.length > 0 && (
              <div className="p-2 border-t border-gray-800">
                <button
                  onClick={() => { setShowWalletMenu(false); setShowConnectMenu(true) }}
                  className="w-full flex items-center justify-center gap-2 p-3 text-cyan-400 hover:bg-cyan-500/10 active:bg-cyan-500/20 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Connect Another Wallet</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Connect Wallet Menu - Inline Accordion Dropdown (not fullscreen) */}
      {showConnectMenu && (
        <div className="relative z-50 mt-3 bg-gray-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-cyan-400 uppercase tracking-wider font-bold">+ Add Wallet</p>
            <button onClick={() => setShowConnectMenu(false)} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {/* MetaMask */}
            {availableWallets.includes('metamask') && (
              <button
                onClick={connectMetaMask}
                disabled={isConnecting !== null}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center text-lg">
                    🦊
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium text-sm block">MetaMask</span>
                    <span className="text-[10px] text-gray-500">{isMobile() ? 'Open app' : 'Extension'}</span>
                  </div>
                </div>
                {isConnecting === 'metamask' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                )}
              </button>
            )}

            {/* Coinbase */}
            {availableWallets.includes('coinbase') && (
              <button
                onClick={connectCoinbase}
                disabled={isConnecting !== null}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg">
                    🔵
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium text-sm block">Coinbase</span>
                    <span className="text-[10px] text-gray-500">{isMobile() ? 'Open app' : 'Extension'}</span>
                  </div>
                </div>
                {isConnecting === 'coinbase' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                )}
              </button>
            )}

            {/* WalletConnect */}
            {availableWallets.includes('walletconnect') && (
              <button
                onClick={connectWalletConnect}
                disabled={isConnecting !== null}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
                    🔗
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium text-sm block">WalletConnect</span>
                    <span className="text-[10px] text-gray-500">{isMobile() ? 'Rainbow, Trust' : '300+ wallets'}</span>
                  </div>
                </div>
                {isConnecting === 'walletconnect' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                )}
              </button>
            )}

            {/* Phantom */}
            {availableWallets.includes('phantom') && (
              <button
                onClick={connectPhantom}
                disabled={isConnecting !== null}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center text-lg">
                    👻
                  </div>
                  <div className="text-left">
                    <span className="text-white font-medium text-sm block">Phantom</span>
                    <span className="text-[10px] text-gray-500">{isMobile() ? 'Open app' : 'Solana'}</span>
                  </div>
                </div>
                {isConnecting === 'phantom' ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletSelector
