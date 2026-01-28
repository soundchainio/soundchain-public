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
 */

import { useState, useCallback, useEffect } from 'react'
import classNames from 'classnames'
import { Matic } from 'components/Matic'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMe } from 'hooks/useMe'
import { Logo } from 'icons/Logo'
import { MetaMask } from 'icons/MetaMask'
import { DefaultWallet, useUpdateDefaultWalletMutation } from 'lib/graphql'
import { Ogun } from '../Ogun'
import { ChevronDown, Check, Loader2, Plus, X, Wallet, ExternalLink } from 'lucide-react'
import Web3 from 'web3'

// Wallet type definitions
type WalletType = 'soundchain' | 'metamask' | 'coinbase' | 'walletconnect' | 'phantom'

interface ConnectedWalletInfo {
  type: WalletType
  address: string
  balance: string
  chainId: number
  chainName: string
}

// Wallet configurations
const WALLET_CONFIG: Record<WalletType, { name: string; icon: string; color: string; description: string }> = {
  soundchain: {
    name: 'SoundChain',
    icon: '✨',
    color: 'from-cyan-500 to-purple-500',
    description: 'No extension needed',
  },
  metamask: {
    name: 'MetaMask',
    icon: '🦊',
    color: 'from-orange-500 to-orange-600',
    description: 'Browser extension',
  },
  coinbase: {
    name: 'Coinbase',
    icon: '🔵',
    color: 'from-blue-500 to-blue-600',
    description: 'Extension or mobile',
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: '🔗',
    color: 'from-blue-400 to-purple-500',
    description: '300+ mobile wallets',
  },
  phantom: {
    name: 'Phantom',
    icon: '👻',
    color: 'from-purple-500 to-purple-600',
    description: 'Solana wallet',
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
  const me = useMe()
  const { account: magicAccount, balance: magicBalance, ogunBalance: magicOgunBalance } = useMagicContext()
  const [updateDefaultWallet] = useUpdateDefaultWalletMutation()

  // Connected external wallets
  const [externalWallets, setExternalWallets] = useState<ConnectedWalletInfo[]>([])
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('soundchain')
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [showConnectMenu, setShowConnectMenu] = useState(false)
  const [isConnecting, setIsConnecting] = useState<WalletType | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    } else if (type === 'metamask') {
      updateDefaultWallet({ variables: { input: { defaultWallet: DefaultWallet.MetaMask } } })
    }

    // Notify parent
    const wallet = type === 'soundchain'
      ? { address: magicAccount || '', type }
      : externalWallets.find(w => w.type === type)
    if (wallet && onWalletChange) {
      onWalletChange(wallet.address, type)
    }
  }, [magicAccount, externalWallets, updateDefaultWallet, onWalletChange])

  // Connect MetaMask
  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed')
      return
    }

    setIsConnecting('metamask')
    setError(null)

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!accounts?.[0]) throw new Error('No account')

      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainIdHex, 16)
      const web3 = new Web3(window.ethereum as any)
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

      // Listen for changes
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setExternalWallets(prev => prev.filter(w => w.type !== 'metamask'))
          setSelectedWallet('soundchain')
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to connect')
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Connect Coinbase Wallet
  const connectCoinbase = useCallback(async () => {
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
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Coinbase')
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Connect WalletConnect
  const connectWalletConnect = useCallback(async () => {
    setIsConnecting('walletconnect')
    setError(null)

    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

      const provider = await EthereumProvider.init({
        projectId,
        chains: [137],
        optionalChains: [1, 8453, 42161, 7000],
        showQrModal: true,
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/logo.png'],
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

      provider.on('disconnect', () => {
        setExternalWallets(prev => prev.filter(w => w.type !== 'walletconnect'))
        setSelectedWallet('soundchain')
      })
    } catch (err: any) {
      if (!err.message?.includes('User rejected')) {
        setError(err.message || 'Failed to connect')
      }
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Connect Phantom (Solana)
  const connectPhantom = useCallback(async () => {
    setIsConnecting('phantom')
    setError(null)

    try {
      const phantom = (window as any).solana
      if (!phantom?.isPhantom) {
        setError('Phantom not installed')
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

      phantom.on('disconnect', () => {
        setExternalWallets(prev => prev.filter(w => w.type !== 'phantom'))
        setSelectedWallet('soundchain')
      })
    } catch (err: any) {
      setError(err.message || 'Failed to connect Phantom')
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Disconnect a wallet
  const disconnectWallet = useCallback((type: WalletType) => {
    setExternalWallets(prev => prev.filter(w => w.type !== type))
    if (selectedWallet === type) {
      setSelectedWallet('soundchain')
    }
  }, [selectedWallet])

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

              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{WALLET_CONFIG[currentWallet.type].name}</span>
                  <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{currentWallet.chainName}</span>
                </div>
                <code className="text-xs text-cyan-400 font-mono">{formatAddress(currentWallet.address)}</code>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <Matic value={currentWallet.balance} />
                {showOgun && currentWallet.type === 'soundchain' && (
                  <Ogun value={magicOgunBalance} className="text-xs" />
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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowWalletMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:left-0 sm:right-0 sm:bottom-auto sm:top-full sm:mt-1 bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
            <div className="p-2 border-b border-gray-800 sm:hidden">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto" />
            </div>

            <div className="p-2">
              <p className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">Select Wallet</p>

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

                  <div className="flex items-center gap-2">
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

      {/* Connect Wallet Menu - Mobile Bottom Sheet */}
      {showConnectMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowConnectMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:left-0 sm:right-0 sm:bottom-auto sm:top-full sm:mt-1 bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
            <div className="p-2 border-b border-gray-800 sm:hidden">
              <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto" />
            </div>

            <div className="p-2">
              <p className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">Connect Wallet</p>

              {/* MetaMask */}
              {availableWallets.includes('metamask') && (
                <button
                  onClick={connectMetaMask}
                  disabled={isConnecting !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl">
                      🦊
                    </div>
                    <div className="text-left">
                      <span className="text-white font-bold block">MetaMask</span>
                      <span className="text-xs text-gray-500">Browser extension</span>
                    </div>
                  </div>
                  {isConnecting === 'metamask' ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}

              {/* Coinbase */}
              {availableWallets.includes('coinbase') && (
                <button
                  onClick={connectCoinbase}
                  disabled={isConnecting !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl">
                      🔵
                    </div>
                    <div className="text-left">
                      <span className="text-white font-bold block">Coinbase Wallet</span>
                      <span className="text-xs text-gray-500">Extension or mobile app</span>
                    </div>
                  </div>
                  {isConnecting === 'coinbase' ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}

              {/* WalletConnect */}
              {availableWallets.includes('walletconnect') && (
                <button
                  onClick={connectWalletConnect}
                  disabled={isConnecting !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl">
                      🔗
                    </div>
                    <div className="text-left">
                      <span className="text-white font-bold block">WalletConnect</span>
                      <span className="text-xs text-gray-500">Rainbow, Trust, & 300+ wallets</span>
                    </div>
                  </div>
                  {isConnecting === 'walletconnect' ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}

              {/* Phantom */}
              {availableWallets.includes('phantom') && (
                <button
                  onClick={connectPhantom}
                  disabled={isConnecting !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl">
                      👻
                    </div>
                    <div className="text-left">
                      <span className="text-white font-bold block">Phantom</span>
                      <span className="text-xs text-gray-500">Solana wallet</span>
                    </div>
                  </div>
                  {isConnecting === 'phantom' ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
            </div>

            {/* Cancel Button - Mobile */}
            <div className="p-3 border-t border-gray-800 sm:hidden">
              <button
                onClick={() => setShowConnectMenu(false)}
                className="w-full p-3 text-gray-400 hover:text-white text-center rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default WalletSelector
