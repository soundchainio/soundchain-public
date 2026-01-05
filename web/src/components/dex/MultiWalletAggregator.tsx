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
  Coins,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react'
import { WalletNFTCollection } from './WalletNFTCollection'
import { useMagicContext } from 'hooks/useMagicContext'
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
  stakedOgunBalance?: string
  totalNFTs?: number
  maticUsdPrice?: number
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
  stakedOgunBalance,
  totalNFTs,
  maticUsdPrice,
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

  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set(['magic']))
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null)
  const [metamaskBalance, setMetamaskBalance] = useState<string>('0')
  const [metamaskOgunBalance, setMetamaskOgunBalance] = useState<string>('0')
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false)
  // Accordion state - collapsed by default on mobile
  const [isWalletDetailsExpanded, setIsWalletDetailsExpanded] = useState(false)

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
        isActive: !walletConnectedAddress && !metamaskAddress
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
        isActive: !walletConnectedAddress && !!metamaskAddress
      })
    }

    // Magic Wallet Module connected wallet (external wallets like MetaMask via Magic UI)
    if (walletConnectedAddress && walletConnectedAddress !== userWallet && walletConnectedAddress !== metamaskAddress) {
      wallets.push({
        id: 'magic-external',
        type: 'walletconnect', // Using walletconnect type for display purposes
        address: walletConnectedAddress,
        chainName: 'Polygon',
        balance: '0', // Would need to fetch
        ogunBalance: '0',
        nfts: [],
        isActive: true
      })
    }

    setConnectedWallets(wallets)
  }, [userWallet, maticBalance, ogunBalance, ownedTracks, metamaskAddress, metamaskBalance, metamaskOgunBalance, walletConnectedAddress])

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

  // Count total connected wallets
  const totalConnectedWallets = (userWallet ? 1 : 0) + (metamaskAddress ? 1 : 0) + (walletConnectedAddress ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* COLLAPSIBLE WALLET DETAILS ACCORDION - Merged Connect + Connected Wallets */}
      <Card className="retro-card overflow-hidden border-cyan-500/30">
        {/* Accordion Header - Always visible, shows summary */}
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          onClick={() => setIsWalletDetailsExpanded(!isWalletDetailsExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white">Wallet Details</h3>
              <p className="text-xs text-gray-500">
                {totalConnectedWallets} wallet{totalConnectedWallets !== 1 ? 's' : ''} • {totalNFTs || 0} NFTs • {(Number(ogunBalance || 0) + Number(stakedOgunBalance || 0)).toFixed(0)} OGUN
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userWallet && <span className="text-lg">✨</span>}
            {metamaskAddress && <span className="text-lg">🦊</span>}
            {walletConnectedAddress && <span className="text-lg">🔗</span>}
            {isWalletDetailsExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Accordion Content - Expandable */}
        {isWalletDetailsExpanded && (
          <div className="border-t border-cyan-500/20 p-4 bg-black/20 space-y-4">
            {/* Connect More Wallets */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Connect Wallets</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  className={`p-2 rounded-lg border text-center transition-all ${
                    userWallet ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 bg-black/30'
                  }`}
                  onClick={() => userWallet && toggleExpanded('magic')}
                >
                  <span className="text-lg">✨</span>
                  {userWallet && <Check className="w-3 h-3 text-green-400 mx-auto mt-1" />}
                </button>
                <button
                  className={`p-2 rounded-lg border text-center transition-all ${
                    walletConnectedAddress ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 bg-black/30 hover:border-purple-500/50'
                  }`}
                  onClick={connectWallet}
                  disabled={isConnectingWallet}
                >
                  <span className="text-lg">{isConnectingWallet ? '...' : '🔗'}</span>
                  {walletConnectedAddress && <Check className="w-3 h-3 text-green-400 mx-auto mt-1" />}
                </button>
                <button
                  className={`p-2 rounded-lg border text-center transition-all ${
                    metamaskAddress ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-black/30 hover:border-orange-500/50'
                  }`}
                  onClick={metamaskAddress ? () => toggleExpanded('metamask') : connectMetaMask}
                  disabled={isConnectingMetaMask}
                >
                  <span className="text-lg">🦊</span>
                  {metamaskAddress && <Check className="w-3 h-3 text-green-400 mx-auto mt-1" />}
                </button>
                <button className="p-2 rounded-lg border border-gray-700 bg-black/30 text-center opacity-50" disabled>
                  <span className="text-lg">🟢</span>
                  <p className="text-[8px] text-yellow-400">Soon</p>
                </button>
              </div>
            </div>

            {/* Connected Wallet Details */}
            {userWallet && (
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>✨</span>
                    <span className="text-sm font-bold text-cyan-400">SoundChain</span>
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">Active</Badge>
                  </div>
                  <a
                    href={`https://polygonscan.com/address/${userWallet}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-500 hover:text-cyan-400"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-gray-400 font-mono">{formatAddress(userWallet)}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-purple-400">{maticBalance || '0'} MATIC</span>
                  <span className="text-yellow-400">{ogunBalance || '0'} OGUN</span>
                </div>
              </div>
            )}

            {metamaskAddress && (
              <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>🦊</span>
                    <span className="text-sm font-bold text-orange-400">MetaMask</span>
                  </div>
                  <button onClick={disconnectMetaMask} className="text-gray-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-mono">{formatAddress(metamaskAddress)}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-purple-400">{metamaskBalance} MATIC</span>
                  <span className="text-yellow-400">{metamaskOgunBalance} OGUN</span>
                </div>
              </div>
            )}

            {walletConnectedAddress && (
              <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>🔗</span>
                    <span className="text-sm font-bold text-purple-400">External Wallet</span>
                  </div>
                  <button onClick={disconnectExternalWallet} className="text-gray-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-mono">{formatAddress(walletConnectedAddress)}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* BALANCE CARDS - Always visible */}
      {userWallet && (
        <Card className="retro-card p-4">
          <div className="mb-3 text-center">
            <a
              href={`https://polygonscan.com/address/${userWallet}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
            >
              Verify on Polygonscan: {userWallet.slice(0, 8)}...{userWallet.slice(-6)} ↗
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="metadata-section p-3 text-center hover:border-yellow-500/50 transition-all">
              <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-1">OGUN Total</p>
              <p className="text-lg font-bold text-yellow-400">
                {(Number(ogunBalance || 0) + Number(stakedOgunBalance || 0)).toFixed(2)}
              </p>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p className="text-green-400/80">{ogunBalance || '0.00'} liquid</p>
                <p className="text-orange-400/80">{stakedOgunBalance || '0.00'} staked</p>
              </div>
            </Card>
            <Card className="metadata-section p-3 text-center hover:border-purple-500/50 transition-all">
              <div className="w-6 h-6 mx-auto mb-1 text-purple-400">
                <svg viewBox="0 0 38 33" fill="currentColor"><path d="M29.7 16.5l-11.7 6.7-11.7-6.7 11.7-16.5 11.7 16.5zM18 25.2l-11.7-6.7 11.7 16.5 11.7-16.5-11.7 6.7z"/></svg>
              </div>
              <p className="text-xs text-gray-400 mb-1">MATIC</p>
              <p className="text-lg font-bold text-purple-400">{maticBalance || '0.00'}</p>
              <p className="text-xs text-gray-500">≈ ${maticUsdPrice ? (Number(maticBalance || 0) * maticUsdPrice).toFixed(2) : '0.00'}</p>
            </Card>
            <Card className="metadata-section p-3 text-center hover:border-cyan-500/50 transition-all">
              <ImageIcon className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-1">NFTs</p>
              <p className="text-lg font-bold text-cyan-400">{totalNFTs ?? 0}</p>
              <p className="text-xs text-gray-500">Owned</p>
            </Card>
            <Card className="metadata-section p-3 text-center hover:border-green-500/50 transition-all">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400 mb-1">Total Value</p>
              <p className="text-lg font-bold text-green-400">
                ${maticUsdPrice ? (Number(maticBalance || 0) * maticUsdPrice).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500">Portfolio</p>
            </Card>
          </div>
        </Card>
      )}

      {/* NFT COLLECTION - Horizontal scroll */}
      {ownedTracks.length > 0 && (
        <Card className="retro-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-purple-500/20 text-purple-400 text-xs">
              NFT COLLECTION
            </Badge>
            <span className="text-xs text-gray-500">{ownedTracks.length} tracks</span>
          </div>
          <WalletNFTCollection
            tracks={ownedTracks}
            onPlayTrack={onPlayTrack}
            onTrackClick={onTrackClick}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
          />
        </Card>
      )}
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
