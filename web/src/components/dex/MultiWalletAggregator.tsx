/**
 * Multi-Wallet Aggregator - Connect and view multiple wallets inline
 * Unique feature: View NFTs from all connected wallets in one place
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Wallet,
  Plus,
  X,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { WalletNFTCollection } from './WalletNFTCollection'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { config } from 'config'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import MetaMaskOnboarding from '@metamask/onboarding'
import { useGroupedTracksLazyQuery, SortTrackField, SortOrder } from 'lib/graphql'

interface ConnectedWallet {
  id: string
  type: 'magic' | 'metamask' | 'walletconnect' | 'coinbase' | 'web3modal' | 'rainbow' | 'base'
  address: string
  chainName: string
  chainId?: number
  balance: string
  ogunBalance: string
  nfts: NFTTrack[]
  isActive: boolean
  icon?: string
}

interface NFTTrack {
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  audioUrl?: string
  tokenId?: number | string
}

interface MultiWalletAggregatorProps {
  userWallet?: string
  maticBalance?: string
  ogunBalance?: string
  ownedTracks?: any[]
  onPlayTrack?: (track: any, index: number) => void
  onTrackClick?: (trackId: string) => void
  currentTrackId?: string
  isPlaying?: boolean
}

// Token contract helper
const getOgunBalance = async (web3: Web3, address: string): Promise<string> => {
  try {
    const contract = new web3.eth.Contract(
      SoundchainOGUN20.abi as AbiItem[],
      config.ogunTokenAddress as string
    )
    const balance = await contract.methods.balanceOf(address).call()
    const validBalance = typeof balance === 'bigint' ? balance.toString() : String(balance || '0')
    return Number(web3.utils.fromWei(validBalance, 'ether')).toFixed(2)
  } catch {
    return '0'
  }
}

export function MultiWalletAggregator({
  userWallet,
  maticBalance,
  ogunBalance,
  ownedTracks = [],
  onPlayTrack,
  onTrackClick,
  currentTrackId,
  isPlaying,
}: MultiWalletAggregatorProps) {
  const {
    web3: magicWeb3,
    connectWallet,
    walletConnectedAddress,
    isConnectingWallet,
    disconnectExternalWallet
  } = useMagicContext()

  // Web3Modal / Unified Wallet integration
  const {
    activeWalletType,
    activeAddress: web3ModalAddress,
    activeBalance: web3ModalBalance,
    activeOgunBalance: web3ModalOgunBalance,
    isConnected: isWeb3ModalConnected,
    chainName: web3ModalChainName,
    connectWeb3Modal,
    disconnectWallet: disconnectWeb3Modal,
  } = useUnifiedWallet()

  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set(['magic']))
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null)
  const [metamaskBalance, setMetamaskBalance] = useState<string>('0')
  const [metamaskOgunBalance, setMetamaskOgunBalance] = useState<string>('0')
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false)

  // NFT fetching for external wallets
  const [externalWalletNfts, setExternalWalletNfts] = useState<Record<string, NFTTrack[]>>({})
  const [loadingNfts, setLoadingNfts] = useState<Record<string, boolean>>({})

  // GraphQL lazy query for fetching NFTs by owner address
  const [fetchNftsForWallet] = useGroupedTracksLazyQuery()

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMetaMaskInstalled(MetaMaskOnboarding.isMetaMaskInstalled())
    }
  }, [])

  // Connect MetaMask directly
  const connectMetaMask = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      const onboarding = new MetaMaskOnboarding()
      onboarding.startOnboarding()
      return
    }

    try {
      setIsConnectingMetaMask(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts[0]) {
        setMetamaskAddress(accounts[0])

        // Get balances
        const web3 = new Web3(window.ethereum)
        const balance = await web3.eth.getBalance(accounts[0])
        setMetamaskBalance(Number(web3.utils.fromWei(balance, 'ether')).toFixed(4))

        const ogun = await getOgunBalance(web3, accounts[0])
        setMetamaskOgunBalance(ogun)
      }
    } catch (err) {
      console.error('MetaMask connection error:', err)
    } finally {
      setIsConnectingMetaMask(false)
    }
  }, [isMetaMaskInstalled])

  // Disconnect MetaMask
  const disconnectMetaMask = useCallback(() => {
    setMetamaskAddress(null)
    setMetamaskBalance('0')
    setMetamaskOgunBalance('0')
  }, [])

  // Fetch NFTs for any wallet address (SoundChain NFTs on Polygon)
  const fetchNftsForAddress = useCallback(async (address: string) => {
    if (!address || loadingNfts[address] || externalWalletNfts[address]) return

    setLoadingNfts(prev => ({ ...prev, [address]: true }))

    try {
      const result = await fetchNftsForWallet({
        variables: {
          filter: { nftData: { owner: address } },
          sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
        },
      })

      const tracks = result.data?.groupedTracks?.nodes || []
      const nfts: NFTTrack[] = tracks.map((track: any) => ({
        id: track.id,
        title: track.title,
        artist: track.artist || track.profile?.displayName || 'Unknown Artist',
        artworkUrl: track.artworkUrl,
        audioUrl: track.playbackUrl,
        tokenId: track.nftData?.tokenId || track.tokenId,
      }))

      setExternalWalletNfts(prev => ({ ...prev, [address]: nfts }))
    } catch (error) {
      console.error('Failed to fetch NFTs for wallet:', address, error)
      setExternalWalletNfts(prev => ({ ...prev, [address]: [] }))
    } finally {
      setLoadingNfts(prev => ({ ...prev, [address]: false }))
    }
  }, [fetchNftsForWallet, loadingNfts, externalWalletNfts])

  // Auto-fetch NFTs when external wallets connect
  useEffect(() => {
    if (isWeb3ModalConnected && web3ModalAddress && web3ModalAddress !== userWallet) {
      fetchNftsForAddress(web3ModalAddress)
    }
  }, [isWeb3ModalConnected, web3ModalAddress, userWallet, fetchNftsForAddress])

  useEffect(() => {
    if (metamaskAddress && metamaskAddress !== userWallet) {
      fetchNftsForAddress(metamaskAddress)
    }
  }, [metamaskAddress, userWallet, fetchNftsForAddress])

  // Build connected wallets list
  useEffect(() => {
    const wallets: ConnectedWallet[] = []

    // Magic Wallet (always first if user is logged in)
    if (userWallet) {
      wallets.push({
        id: 'magic',
        type: 'magic',
        address: userWallet,
        chainName: 'Polygon',
        chainId: 137,
        balance: maticBalance || '0',
        ogunBalance: ogunBalance || '0',
        nfts: ownedTracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist || t.profile?.displayName || 'Unknown',
          artworkUrl: t.artworkUrl,
          audioUrl: t.playbackUrl,
          tokenId: t.tokenId,
        })),
        isActive: !walletConnectedAddress && !metamaskAddress && !isWeb3ModalConnected,
        icon: '✨'
      })
    }

    // Web3Modal Wallet (MetaMask, Coinbase, Rainbow, etc. via Web3Modal)
    if (isWeb3ModalConnected && web3ModalAddress && web3ModalAddress !== userWallet) {
      wallets.push({
        id: 'web3modal',
        type: 'web3modal',
        address: web3ModalAddress,
        chainName: web3ModalChainName || 'Unknown Chain',
        balance: web3ModalBalance || '0',
        ogunBalance: web3ModalOgunBalance || '0',
        nfts: externalWalletNfts[web3ModalAddress] || [],
        isActive: activeWalletType === 'web3modal',
        icon: '🔗'
      })
    }

    // MetaMask Wallet (if connected directly - legacy)
    if (metamaskAddress && metamaskAddress !== userWallet && metamaskAddress !== web3ModalAddress) {
      wallets.push({
        id: 'metamask',
        type: 'metamask',
        address: metamaskAddress,
        chainName: 'Polygon',
        chainId: 137,
        balance: metamaskBalance,
        ogunBalance: metamaskOgunBalance,
        nfts: externalWalletNfts[metamaskAddress] || [],
        isActive: !walletConnectedAddress && !!metamaskAddress && !isWeb3ModalConnected,
        icon: '🦊'
      })
    }

    // Magic Wallet Module connected wallet (external wallets like MetaMask via Magic UI)
    if (walletConnectedAddress && walletConnectedAddress !== userWallet && walletConnectedAddress !== metamaskAddress && walletConnectedAddress !== web3ModalAddress) {
      wallets.push({
        id: 'magic-external',
        type: 'walletconnect',
        address: walletConnectedAddress,
        chainName: 'Polygon',
        chainId: 137,
        balance: '0',
        ogunBalance: '0',
        nfts: externalWalletNfts[walletConnectedAddress] || [],
        isActive: true,
        icon: '🔗'
      })
    }

    setConnectedWallets(wallets)
  }, [userWallet, maticBalance, ogunBalance, ownedTracks, metamaskAddress, metamaskBalance, metamaskOgunBalance, walletConnectedAddress, isWeb3ModalConnected, web3ModalAddress, web3ModalBalance, web3ModalOgunBalance, web3ModalChainName, activeWalletType, externalWalletNfts])

  const toggleExpanded = (walletId: string) => {
    setExpandedWallets(prev => {
      const next = new Set(prev)
      if (next.has(walletId)) {
        next.delete(walletId)
      } else {
        next.add(walletId)
      }
      return next
    })
  }

  const getWalletIcon = (type: string, icon?: string) => {
    if (icon) return icon
    switch (type) {
      case 'magic': return '✨'
      case 'metamask': return '🦊'
      case 'walletconnect': return '🔗'
      case 'web3modal': return '🌐'
      case 'coinbase': return '🔵'
      case 'rainbow': return '🌈'
      case 'base': return '🔷'
      default: return '💳'
    }
  }

  const getWalletName = (type: string) => {
    switch (type) {
      case 'magic': return 'SoundChain Wallet'
      case 'metamask': return 'MetaMask'
      case 'walletconnect': return 'WalletConnect'
      case 'web3modal': return 'External Wallet'
      case 'coinbase': return 'Coinbase'
      case 'rainbow': return 'Rainbow'
      case 'base': return 'Base'
      default: return 'Wallet'
    }
  }

  // Get chain-specific currency symbol
  const getChainCurrency = (chainName: string) => {
    switch (chainName?.toLowerCase()) {
      case 'ethereum': return 'ETH'
      case 'polygon': return 'POL'
      case 'base': return 'ETH'
      case 'arbitrum': return 'ETH'
      case 'optimism': return 'ETH'
      case 'zetachain': return 'ZETA'
      case 'avalanche': return 'AVAX'
      case 'solana': return 'SOL'
      default: return 'POL'
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className="space-y-4">
      {/* Connect Wallet Options - TOP OF PAGE */}
      <Card className="retro-card p-4 border-cyan-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Connect Wallets</h3>
          </div>
          <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
            {connectedWallets.length} Connected
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Magic Wallet - SoundChain Native */}
          <button
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              userWallet
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-700 bg-black/30 hover:border-cyan-500/50'
            }`}
            onClick={() => userWallet && toggleExpanded('magic')}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">✨</span>
              <span className={`font-bold text-sm ${userWallet ? 'text-cyan-400' : 'text-gray-400'}`}>SoundChain</span>
              {userWallet && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">Native wallet</p>
          </button>

          {/* Web3Modal - Primary button for external wallets (300+ options) */}
          <button
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              isWeb3ModalConnected && web3ModalAddress
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 bg-black/30 hover:border-purple-500/50'
            }`}
            onClick={isWeb3ModalConnected ? () => toggleExpanded('web3modal') : connectWeb3Modal}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌐</span>
              <span className={`font-bold text-sm ${isWeb3ModalConnected ? 'text-purple-400' : 'text-gray-400'}`}>
                Web3 Wallet
              </span>
              {isWeb3ModalConnected && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">
              {isWeb3ModalConnected && web3ModalAddress ? formatAddress(web3ModalAddress) : 'MetaMask, Coinbase, Rainbow...'}
            </p>
          </button>

          {/* Direct MetaMask - Fallback for power users */}
          <button
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              metamaskAddress
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-gray-700 bg-black/30 hover:border-orange-500/50'
            }`}
            onClick={metamaskAddress ? () => toggleExpanded('metamask') : connectMetaMask}
            disabled={isConnectingMetaMask}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🦊</span>
              <span className={`font-bold text-sm ${metamaskAddress ? 'text-orange-400' : 'text-gray-400'}`}>
                {isConnectingMetaMask ? '...' : 'MetaMask'}
              </span>
              {metamaskAddress && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">
              {metamaskAddress ? formatAddress(metamaskAddress) : (isMetaMaskInstalled ? 'Direct connect' : 'Install')}
            </p>
          </button>

          {/* ZetaChain - Omnichain Support */}
          <button
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              isWeb3ModalConnected && web3ModalChainName === 'ZetaChain'
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 bg-black/30 hover:border-green-500/50'
            }`}
            onClick={connectWeb3Modal}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🟢</span>
              <span className={`font-bold text-sm ${
                isWeb3ModalConnected && web3ModalChainName === 'ZetaChain' ? 'text-green-400' : 'text-gray-400'
              }`}>
                ZetaChain
              </span>
              {isWeb3ModalConnected && web3ModalChainName === 'ZetaChain' && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">Omnichain</p>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Connect multiple wallets to view all your NFTs in one place
        </p>
      </Card>

      {/* Connected Wallets with NFT Collections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            CONNECTED WALLETS
          </h3>
          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
            {connectedWallets.reduce((acc, w) => acc + w.nfts.length, 0)} Total NFTs
          </Badge>
        </div>

        {connectedWallets.length === 0 ? (
          <Card className="retro-card p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No wallets connected</p>
            <p className="text-xs text-gray-500 mt-1">Connect a wallet above to view your NFTs</p>
          </Card>
        ) : (
          connectedWallets.map(wallet => (
            <Card
              key={wallet.id}
              className={`retro-card overflow-hidden transition-all ${
                wallet.isActive ? 'border-cyan-500/50' : ''
              }`}
            >
              {/* Wallet Header - Clickable to expand */}
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                onClick={() => toggleExpanded(wallet.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    wallet.type === 'magic' ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-500/30' :
                    wallet.type === 'metamask' ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 border border-orange-500/30' :
                    wallet.type === 'web3modal' ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/30' :
                    'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/30'
                  }`}>
                    <span className="text-2xl">{getWalletIcon(wallet.type, wallet.icon)}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold">{formatAddress(wallet.address)}</span>
                      {wallet.isActive && (
                        <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{getWalletName(wallet.type)}</span>
                      <Badge className={`text-[10px] px-1.5 ${
                        wallet.chainName === 'Polygon' ? 'bg-purple-500/20 text-purple-400' :
                        wallet.chainName === 'Ethereum' ? 'bg-blue-500/20 text-blue-400' :
                        wallet.chainName === 'Base' ? 'bg-blue-500/20 text-blue-400' :
                        wallet.chainName === 'ZetaChain' ? 'bg-green-500/20 text-green-400' :
                        wallet.chainName === 'Arbitrum' ? 'bg-blue-500/20 text-blue-400' :
                        wallet.chainName === 'Optimism' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {wallet.chainName}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{wallet.balance} {getChainCurrency(wallet.chainName)}</p>
                    <p className="text-xs text-purple-400">{wallet.ogunBalance} OGUN</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                      {wallet.nfts.length} NFTs
                    </Badge>
                    {expandedWallets.has(wallet.id) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded NFT Collection */}
              {expandedWallets.has(wallet.id) && (
                <div className="border-t border-cyan-500/20 p-4 bg-black/20">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                      NFT COLLECTION
                    </Badge>
                    <div className="flex items-center gap-2">
                      <a
                        href={`${config.polygonscan}address/${wallet.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(wallet.address)
                        }}
                        className="text-gray-500 hover:text-cyan-400 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {wallet.type === 'metamask' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            disconnectMetaMask()
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {(wallet.type === 'walletconnect' || wallet.id === 'magic-external') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            disconnectExternalWallet()
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {wallet.type === 'web3modal' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            disconnectWeb3Modal()
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          title="Disconnect wallet"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingNfts[wallet.address] ? (
                    <div className="py-6 text-center">
                      <Loader2 className="w-6 h-6 text-cyan-400 mx-auto animate-spin mb-2" />
                      <div className="text-gray-500 text-sm">Loading SoundChain NFTs...</div>
                    </div>
                  ) : wallet.nfts.length > 0 ? (
                    <div
                      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pb-2"
                    >
                      {wallet.nfts.map((nft, index) => (
                        <NFTThumbnail
                          key={nft.id}
                          nft={nft}
                          isPlaying={isPlaying && currentTrackId === nft.id}
                          isCurrentTrack={currentTrackId === nft.id}
                          onPlay={() => onPlayTrack?.(nft, index)}
                          onClick={() => onTrackClick?.(nft.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <div className="text-gray-500 text-sm mb-2">
                        {wallet.type === 'magic'
                          ? 'No NFTs owned yet'
                          : `No SoundChain NFTs found on ${wallet.chainName}`}
                      </div>
                      {wallet.type !== 'magic' && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            Only SoundChain music NFTs are displayed
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Clear cached NFTs to force refetch
                              setExternalWalletNfts(prev => {
                                const next = { ...prev }
                                delete next[wallet.address]
                                return next
                              })
                              fetchNftsForAddress(wallet.address)
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// NFT Thumbnail component
function NFTThumbnail({
  nft,
  isPlaying,
  isCurrentTrack,
  onPlay,
  onClick
}: {
  nft: NFTTrack
  isPlaying: boolean
  isCurrentTrack: boolean
  onPlay: () => void
  onClick: () => void
}) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const defaultImage = '/default-pictures/album-artwork.png'

  // Simple IPFS transform
  const getImageUrl = (url?: string) => {
    if (!url) return defaultImage
    if (url.startsWith('ipfs://')) {
      return `https://soundchain.mypinata.cloud/ipfs/${url.replace('ipfs://', '')}`
    }
    return url
  }

  const displayImage = imageError ? defaultImage : getImageUrl(nft.artworkUrl)

  return (
    <div
      className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isCurrentTrack ? 'ring-2 ring-cyan-400 scale-105' : 'hover:scale-105'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={displayImage}
        alt={nft.title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />

      {(isHovered || isCurrentTrack) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
          >
            {isPlaying && isCurrentTrack ? (
              <span className="text-black text-xs">❚❚</span>
            ) : (
              <span className="text-black text-xs ml-0.5">▶</span>
            )}
          </button>
        </div>
      )}

      {isPlaying && isCurrentTrack && (
        <div className="absolute bottom-0.5 left-0.5 right-0.5">
          <div className="h-0.5 bg-cyan-400 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}

export default MultiWalletAggregator
