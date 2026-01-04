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
  Check
} from 'lucide-react'
import { WalletNFTCollection } from './WalletNFTCollection'
import { useMagicContext } from 'hooks/useMagicContext'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { config } from 'config'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import SoundchainOGUN20 from 'contract/SoundchainOGUN20.sol/SoundchainOGUN20.json'
import MetaMaskOnboarding from '@metamask/onboarding'

interface ConnectedWallet {
  id: string
  type: 'magic' | 'metamask' | 'walletconnect' | 'coinbase'
  address: string
  chainName: string
  balance: string
  ogunBalance: string
  nfts: NFTTrack[]
  isActive: boolean
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
  openWeb3Modal?: () => void
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
  openWeb3Modal
}: MultiWalletAggregatorProps) {
  const { web3: magicWeb3 } = useMagicContext()
  const { activeAddress, activeWalletType, isConnected: isUnifiedConnected, disconnectWallet } = useUnifiedWallet()

  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set(['magic']))
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null)
  const [metamaskBalance, setMetamaskBalance] = useState<string>('0')
  const [metamaskOgunBalance, setMetamaskOgunBalance] = useState<string>('0')
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false)

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
        isActive: activeWalletType === 'magic'
      })
    }

    // MetaMask Wallet (if connected directly)
    if (metamaskAddress && metamaskAddress !== userWallet) {
      wallets.push({
        id: 'metamask',
        type: 'metamask',
        address: metamaskAddress,
        chainName: 'Polygon',
        balance: metamaskBalance,
        ogunBalance: metamaskOgunBalance,
        nfts: [], // Would need to query NFTs for this address
        isActive: activeWalletType === 'metamask'
      })
    }

    // WalletConnect/Web3Modal Wallet (if connected and different from Magic)
    if (isUnifiedConnected && activeAddress && activeAddress !== userWallet && activeAddress !== metamaskAddress) {
      wallets.push({
        id: 'walletconnect',
        type: 'walletconnect',
        address: activeAddress,
        chainName: 'Polygon',
        balance: '0', // Would need to fetch
        ogunBalance: '0',
        nfts: [],
        isActive: activeWalletType === 'web3modal'
      })
    }

    setConnectedWallets(wallets)
  }, [userWallet, maticBalance, ogunBalance, ownedTracks, metamaskAddress, metamaskBalance, metamaskOgunBalance, isUnifiedConnected, activeAddress, activeWalletType])

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

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'magic': return '✨'
      case 'metamask': return '🦊'
      case 'walletconnect': return '🔗'
      case 'coinbase': return '🔵'
      default: return '💳'
    }
  }

  const getWalletName = (type: string) => {
    switch (type) {
      case 'magic': return 'SoundChain Wallet'
      case 'metamask': return 'MetaMask'
      case 'walletconnect': return 'WalletConnect'
      case 'coinbase': return 'Coinbase'
      default: return 'Wallet'
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Magic Wallet - Default */}
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
              <span className={`font-bold text-sm ${userWallet ? 'text-cyan-400' : 'text-gray-400'}`}>Magic</span>
              {userWallet && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">Native wallet</p>
          </button>

          {/* MetaMask - Direct Connection */}
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
              {metamaskAddress ? formatAddress(metamaskAddress) : (isMetaMaskInstalled ? 'Click to connect' : 'Install')}
            </p>
          </button>

          {/* WalletConnect */}
          <button
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              isUnifiedConnected && activeWalletType === 'web3modal'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-black/30 hover:border-blue-500/50'
            }`}
            onClick={openWeb3Modal}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔗</span>
              <span className="font-bold text-gray-400 text-sm">WalletConnect</span>
              {isUnifiedConnected && activeWalletType === 'web3modal' && <Check className="w-3 h-3 text-green-400" />}
            </div>
            <p className="text-xs text-gray-500">300+ wallets</p>
          </button>

          {/* Coinbase */}
          <button
            className="p-3 rounded-lg border-2 border-gray-700 bg-black/30 text-left transition-all hover:border-blue-500/50"
            onClick={openWeb3Modal}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔵</span>
              <span className="font-bold text-gray-400 text-sm">Coinbase</span>
            </div>
            <p className="text-xs text-gray-500">Coinbase Wallet</p>
          </button>

          {/* ZetaChain - Coming Soon */}
          <button
            className="p-3 rounded-lg border-2 border-gray-700 bg-black/30 text-left transition-all relative opacity-60"
            disabled
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🟢</span>
              <span className="font-bold text-gray-400 text-sm">ZetaChain</span>
            </div>
            <p className="text-xs text-gray-500">Omnichain</p>
            <Badge className="absolute -top-2 -right-2 bg-yellow-500/20 text-yellow-400 text-[10px] px-1">Soon</Badge>
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
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    wallet.type === 'magic' ? 'bg-cyan-500/20' :
                    wallet.type === 'metamask' ? 'bg-orange-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <span className="text-xl">{getWalletIcon(wallet.type)}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 text-sm">{formatAddress(wallet.address)}</span>
                      {wallet.isActive && (
                        <Badge className="bg-green-500/20 text-green-400 text-[10px]">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{getWalletName(wallet.type)} • {wallet.chainName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{wallet.balance} MATIC</p>
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
                      {wallet.type === 'walletconnect' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            disconnectWallet()
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {wallet.nfts.length > 0 ? (
                    <div
                      className="flex gap-2 overflow-x-auto pb-2"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                    <div className="py-4 text-center text-gray-500 text-sm">
                      {wallet.type === 'magic' ? 'No NFTs owned yet' : 'NFT loading coming soon'}
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
