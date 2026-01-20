import React, { useState, useMemo, useCallback, ReactElement, useEffect, useRef, Component, ErrorInfo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Image from 'next/image'
import Head from 'next/head'
import { config } from 'config'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils'
import StakingRewards from '../../contract/StakingRewards.sol/StakingRewards.json'
import { Logo } from 'icons/Logo'
import { SoundchainGoldLogo } from 'icons/SoundchainGoldLogo'
import { Verified as VerifiedIcon } from 'icons/Verified'
import { Document } from 'icons/Document'
import { Feedback } from 'icons/Feedback'
import { Settings as SettingsIcon } from 'icons/Settings'
import { Wallet as WalletIcon } from 'icons/Wallet'
import { NewPost } from 'icons/NewPost'
import { Role } from 'lib/graphql'
import { setJwt } from 'lib/apollo'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMagicContext } from 'hooks/useMagicContext'
import { NFTCard } from 'components/dex/NFTCard'
import { ProfileHeader } from 'components/dex/ProfileHeader'
import { TrackNFTCard } from 'components/dex/TrackNFTCard'
import { CoinbaseNFTCard } from 'components/dex/CoinbaseNFTCard'
import { WalletNFTCollection, WalletNFTGrid } from 'components/dex/WalletNFTCollection'
import { MultiWalletAggregator } from 'components/dex/MultiWalletAggregator'
import { WalletConnectButton } from 'components/dex/WalletConnectButton'
import { GenreSection } from 'components/dex/GenreSection'
import { TopChartsSection } from 'components/dex/TopChartsSection'
import { GenreLeaderboard } from 'components/dex/GenreLeaderboard'
import { gql, useQuery } from '@apollo/client'
import { TokenCard } from 'components/dex/TokenCard'
import { BundleCard } from 'components/dex/BundleCard'
import { Card, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { ScrollArea } from 'components/ui/scroll-area'
import { Separator } from 'components/ui/separator'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { useMeQuery, useGroupedTracksQuery, useTracksQuery, useListingItemsQuery, useExploreUsersQuery, useExploreTracksQuery, useFollowProfileMutation, useUnfollowProfileMutation, useTrackQuery, usePostQuery, useProfileQuery, useProfileByHandleQuery, useChatsQuery, useChatHistoryLazyQuery, useSendMessageMutation, useFavoriteTracksQuery, useNotificationsQuery, usePolygonscanQuery, useMaticUsdQuery, useToggleFavoriteMutation, useFollowersQuery, useFollowingQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { StateProvider } from 'contexts'
import { ModalProvider } from 'contexts/ModalContext'
import { AudioPlayerProvider } from 'hooks/useAudioPlayer'
import { TrackProvider } from 'hooks/useTrack'
import { HideBottomNavBarProvider } from 'hooks/useHideBottomNavBar'
import { LayoutContextProvider } from 'hooks/useLayoutContext'
import { useOmnichain } from 'hooks/useOmnichain'
import { ENABLED_CHAINS, getChainsByCategory } from 'constants/chains'
import { SUPPORTED_TOKENS, TOKEN_INFO, Token, getDisplaySymbol } from 'constants/tokens'
import { ToastContainer, toast } from 'react-toastify'
import dynamic from 'next/dynamic'
import { useUnifiedWallet } from 'contexts/UnifiedWalletContext'
import { LeftSidebar, RightSidebar } from 'components/Sidebar'
import { PlaylistCard, PlaylistDetail, CreatePlaylistModal } from 'components/Playlist'
import { DMModal } from 'components/modals/DMModal'
import { useGetUserPlaylistsQuery, GetUserPlaylistsQuery } from 'lib/graphql'
import {
  Grid, List, Coins, Image as ImageIcon, Package, Search, Home, Music, Library,
  ShoppingBag, Plus, Wallet, Bell, TrendingUp, Zap, Globe, BarChart3, Play, Pause,
  Users, MessageCircle, Share2, Copy, Trophy, Flame, Rocket, Heart, Server,
  Database, X, ChevronDown, ExternalLink, LogOut as Logout, BadgeCheck, ListMusic, Compass, RefreshCw,
  AlertCircle, RefreshCcw, PiggyBank, Settings, Headphones
} from 'lucide-react'

const MobileBottomAudioPlayer = dynamic(() => import('components/common/BottomAudioPlayer/MobileBottomAudioPlayer'))
const DesktopBottomAudioPlayer = dynamic(() => import('components/common/BottomAudioPlayer/DesktopBottomAudioPlayer'))
const AudioEngine = dynamic(() => import('components/common/BottomAudioPlayer/AudioEngine'))
const CreateModal = dynamic(() => import('components/modals/CreateModal'), { ssr: false })
const PostModal = dynamic(() => import('components/Post/PostModal').then(mod => ({ default: mod.PostModal })), { ssr: false })
const AuthorActionsModal = dynamic(() => import('components/modals/AuthorActionsModal').then(mod => ({ default: mod.AuthorActionsModal })), { ssr: false })
const CommentModal = dynamic(() => import('components/Comment/CommentModal'), { ssr: false })
const AudioPlayerModal = dynamic(() => import('components/modals/AudioPlayerModal'), { ssr: false })
const Posts = dynamic(() => import('components/Post/Posts').then(mod => ({ default: mod.Posts })), { ssr: false })
const Post = dynamic(() => import('components/Post/Post').then(mod => ({ default: mod.Post })), { ssr: false })
const Comments = dynamic(() => import('components/Comment/Comments').then(mod => ({ default: mod.Comments })), { ssr: false })
const TracksGrid = dynamic(() => import('components/dex/TracksGrid').then(mod => ({ default: mod.TracksGrid })), { ssr: false })
const GuestPostModal = dynamic(() => import('components/Post/GuestPostModal').then(mod => ({ default: mod.GuestPostModal })), { ssr: false })
const Notifications = dynamic(() => import('components/Notifications').then(mod => ({ default: mod.Notifications })), { ssr: false })
const BioForm = dynamic(() => import('components/forms/profile/BioForm').then(mod => ({ default: mod.BioForm })), { ssr: false })
const ProfilePictureForm = dynamic(() => import('components/forms/profile/ProfilePictureForm').then(mod => ({ default: mod.ProfilePictureForm })), { ssr: false })
const CoverPictureForm = dynamic(() => import('components/forms/profile/CoverPictureForm').then(mod => ({ default: mod.CoverPictureForm })), { ssr: false })
const SocialLinksForm = dynamic(() => import('components/forms/profile/SocialLinksForm').then(mod => ({ default: mod.SocialLinksForm })), { ssr: false })
const SecurityForm = dynamic(() => import('components/forms/profile/SecurityForm').then(mod => ({ default: mod.SecurityForm })), { ssr: false })
const StakingPanel = dynamic(() => import('components/dex/StakingPanel'), { ssr: false })

// Staking contract helper for fetching staked OGUN balance
const tokenStakeContractAddress = config.tokenStakeContractAddress as string
const getStakingContract = (web3: Web3): Contract<AbiItem[]> => {
  return new web3.eth.Contract(StakingRewards.abi as AbiItem[], tokenStakeContractAddress)
}

// SCid query - inline until codegen generates the hook
const SCID_BY_TRACK_QUERY = gql`
  query ScidByTrack($trackId: String!) {
    scidByTrack(trackId: $trackId) {
      scid
      chainCode
      status
      streamCount
      ogunRewardsEarned
      createdAt
    }
  }
`

// Profile streaming rewards query - for the compact aggregator below bio
const PROFILE_STREAMING_REWARDS_QUERY = gql`
  query ProfileStreamingRewards($profileId: String!) {
    scidsByProfile(profileId: $profileId) {
      id
      scid
      streamCount
      ogunRewardsEarned
    }
  }
`

// Real NFT data comes from the database via listingItems query
// NFT listings with prices will be shown in the NFT tab
// Tracks without listings are streaming-only (no price)
// This is what makes SoundChain unique - dual purpose NFTs!

// Navigation pages removed - all tabs now in main DEX view
const navigationPages: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = []

// Error Boundary for catching render errors in profile view
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}
class ProfileErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Profile view error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-400 mb-2">Something went wrong loading this profile</p>
          <p className="text-gray-500 text-sm mb-4 font-mono bg-black/50 p-3 rounded overflow-auto max-h-40">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <p className="text-gray-500 text-xs mb-4 font-mono bg-black/50 p-3 rounded overflow-auto max-h-40">
            {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// WalletConnect Modal Component - Uses WalletConnect v2 with EthereumProvider
function WalletConnectModal({ isOpen, onClose, onConnect }: { isOpen: boolean; onClose: () => void; onConnect: (address: string, walletType: string) => void }) {
  const [connecting, setConnecting] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Detect if we're in an in-app browser (MetaMask, Trust, Coinbase, etc.)
  const isInAppBrowser = typeof window !== 'undefined' && (
    (window.ethereum as any)?.isMetaMask ||
    (window.ethereum as any)?.isTrust ||
    (window.ethereum as any)?.isCoinbaseWallet ||
    (window.ethereum as any)?.isTokenPocket
  )

  const detectedWallet = typeof window !== 'undefined' && window.ethereum
    ? (window.ethereum as any)?.isMetaMask ? 'MetaMask'
    : (window.ethereum as any)?.isTrust ? 'Trust Wallet'
    : (window.ethereum as any)?.isCoinbaseWallet ? 'Coinbase Wallet'
    : 'Browser Wallet'
    : null

  // Check if on mobile (no window.ethereum typically)
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const hasInjectedWallet = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'

  // Dynamic wallet list - show relevant options based on device
  const wallets = [
    // WalletConnect first on mobile (works with all mobile wallets)
    ...(isMobile ? [{ name: 'WalletConnect', icon: '🔗', popular: true, id: 'walletconnect', description: 'Rainbow, Trust, Coinbase & 300+ wallets' }] : []),
    // MetaMask only if extension detected OR on desktop
    ...(hasInjectedWallet || !isMobile ? [{ name: 'MetaMask', icon: '🦊', popular: true, id: 'metamask', description: isMobile ? 'Open in MetaMask app' : 'Browser extension' }] : []),
    // WalletConnect on desktop (after MetaMask)
    ...(!isMobile ? [{ name: 'WalletConnect', icon: '🔗', popular: true, id: 'walletconnect', description: 'Rainbow, Trust, Coinbase & 300+ wallets' }] : []),
    // Coinbase Wallet - deep link on mobile
    { name: 'Coinbase Wallet', icon: '🔵', popular: false, id: 'coinbase', description: isMobile ? 'Open Coinbase app' : 'Browser extension' },
  ]

  // WalletConnect v2 Project ID - use env var or fallback
  // Get your own at https://cloud.walletconnect.com/
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e33134dfeea545054faa3493a504b8d'

  // Auto-connect if in-app browser detected
  useEffect(() => {
    if (isOpen && isInAppBrowser && !connecting) {
      console.log(`🔗 Detected ${detectedWallet} in-app browser, auto-connecting...`)
      handleMetaMaskConnect()
    }
  }, [isOpen, isInAppBrowser])

  const handleMetaMaskConnect = async () => {
    try {
      setConnecting(true)
      setConnectingWallet('metamask')
      setError(null)

      // ALWAYS use WalletConnect on mobile - NO deep links that redirect users away!
      // Users stay on SoundChain and scan QR code with their wallet app
      if (isMobile && !hasInjectedWallet) {
        console.log('🔗 Mobile detected, using WalletConnect QR (no external redirect)')
        setConnecting(false)
        setConnectingWallet(null)
        await handleWalletConnectV2()
        return
      }

      // Check if MetaMask is installed (desktop)
      if (typeof window.ethereum === 'undefined') {
        // No MetaMask? Use WalletConnect instead (connects to MetaMask mobile via QR)
        console.log('🔗 MetaMask not detected, falling back to WalletConnect')
        setConnecting(false)
        setConnectingWallet(null)
        await handleWalletConnectV2()
        return
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        console.log('✅ MetaMask connected:', address)
        onConnect(address, 'MetaMask')
        onClose()
      } else {
        setError('No accounts found. Please unlock MetaMask.')
      }
    } catch (err: any) {
      console.error('❌ MetaMask connection error:', err)
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the request in MetaMask.')
      } else {
        setError(`Failed to connect: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setConnecting(false)
      setConnectingWallet(null)
    }
  }

  const handleCoinbaseConnect = async () => {
    try {
      setConnecting(true)
      setConnectingWallet('coinbase')
      setError(null)

      // ALWAYS use WalletConnect on mobile - NO deep links that redirect users away!
      // Users stay on SoundChain and scan QR code with Coinbase Wallet app
      if (isMobile) {
        console.log('🔗 Mobile detected, using WalletConnect QR for Coinbase (no external redirect)')
        setConnecting(false)
        setConnectingWallet(null)
        await handleWalletConnectV2()
        return
      }

      // On desktop, check for Coinbase Wallet extension
      if ((window.ethereum as any)?.isCoinbaseWallet) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
        if (accounts && accounts.length > 0) {
          onConnect(accounts[0], 'Coinbase Wallet')
          onClose()
        }
      } else {
        // Use WalletConnect for Coinbase on desktop without extension
        await handleWalletConnectV2()
      }
    } catch (err: any) {
      console.error('❌ Coinbase connection error:', err)
      setError(err.message || 'Failed to connect Coinbase Wallet')
    } finally {
      setConnecting(false)
      setConnectingWallet(null)
    }
  }

  const handleWalletConnectV2 = async () => {
    try {
      setConnecting(true)
      setConnectingWallet('walletconnect')
      setError(null)

      // Log project ID status (fallback is used if env not set)
      console.log('🔗 WalletConnect Project ID:', projectId ? 'configured' : 'using fallback')

      // Dynamic import to avoid SSR issues
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')

      // Initialize WalletConnect v2 EthereumProvider
      const provider = await EthereumProvider.init({
        projectId,
        chains: [137], // Polygon mainnet (default)
        optionalChains: [
          1,      // Ethereum mainnet
          8453,   // Base (Coinbase L2)
          42161,  // Arbitrum
          10,     // Optimism
          43114,  // Avalanche
          7000,   // ZetaChain
          80002,  // Polygon Amoy testnet
        ],
        showQrModal: true, // Shows the WalletConnect QR modal automatically
        metadata: {
          name: 'SoundChain',
          description: 'Web3 Music Platform - Stream, Collect, Earn',
          url: 'https://soundchain.io',
          icons: ['https://soundchain.io/soundchain-logo.png']
        },
        qrModalOptions: {
          themeMode: 'dark',
        }
      })

      console.log('🔗 WalletConnect v2 initialized, opening modal...')

      // Connect - this opens the QR code modal
      await provider.connect()

      // Get connected accounts
      const accounts = provider.accounts
      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        console.log('✅ WalletConnect connected:', address)
        onConnect(address, 'WalletConnect')
        onClose()

        // Store provider reference for later use (transactions, signing)
        ;(window as any).__wcProvider = provider

        // Listen for disconnect
        provider.on('disconnect', () => {
          console.log('🔌 WalletConnect disconnected')
          ;(window as any).__wcProvider = null
        })
      } else {
        setError('No accounts returned from wallet.')
      }
    } catch (err: any) {
      console.error('❌ WalletConnect error:', err)
      if (err.message?.includes('User rejected')) {
        setError('Connection cancelled.')
      } else {
        setError(err.message || 'Failed to connect via WalletConnect.')
      }
    } finally {
      setConnecting(false)
      setConnectingWallet(null)
    }
  }

  const handleWalletClick = async (walletId: string, walletName: string) => {
    if (walletId === 'metamask') {
      await handleMetaMaskConnect()
    } else if (walletId === 'walletconnect') {
      await handleWalletConnectV2()
    } else if (walletId === 'coinbase') {
      await handleCoinbaseConnect()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Blur.io style backdrop with heavy blur */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

      {/* Modal container with glassmorphism effect */}
      <div className="relative z-10 w-full max-w-sm mx-4 overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900/95 shadow-2xl shadow-cyan-500/10">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={connecting}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>

          {/* Logo and Title - Blur.io style */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Sign into SoundChain.io</h2>
            <p className="text-sm text-gray-400">Connect your wallet to continue</p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Wallet options - Clean list style like Blur.io */}
        <div className="px-6 pb-4 space-y-2">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => handleWalletClick(wallet.id, wallet.name)}
              disabled={connecting}
              className={`
                w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                ${connectingWallet === wallet.id
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">
                  {wallet.icon}
                </div>
                <div className="text-left">
                  <span className="font-semibold text-white block">{wallet.name}</span>
                  {(wallet as any).description && (
                    <span className="text-xs text-gray-500">{(wallet as any).description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connectingWallet === wallet.id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-cyan-400">Signing...</span>
                  </div>
                ) : wallet.popular && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-xs rounded-full font-medium">
                    Popular
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer - Signature message info */}
        <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700/50">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Secure signature verification</span>
          </div>
          <p className="text-[10px] text-gray-500 text-center leading-relaxed">
            You will be asked to sign a message to verify wallet ownership.
            This signature request is free and doesn't cost any gas.
          </p>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-green-500" />
      </div>
    </div>
  )
}

// Backend Tab Component - API/Aggregator View (Real stats from DB)
function BackendPanel({ isOpen, onClose, totalTracks, totalListings }: { isOpen: boolean; onClose: () => void; totalTracks?: number; totalListings?: number }) {
  if (!isOpen) return null

  const aggregatorStats = [
    { label: 'Tracks Indexed', value: totalTracks?.toLocaleString() || '0', change: 'Live' },
    { label: 'NFT Listings', value: totalListings?.toLocaleString() || '0', change: 'Live' },
    { label: 'Network', value: 'Polygon', change: 'Mainnet' },
    { label: 'GraphQL API', value: 'Active', change: 'Online' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg h-full bg-gray-900/98 border-l border-cyan-500/30 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-cyan-400" />
              <h2 className="retro-title text-lg">Backend Dashboard</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {aggregatorStats.map((stat, idx) => (
              <Card key={idx} className="retro-card">
                <CardContent className="p-4">
                  <div className="metadata-label text-xs">{stat.label}</div>
                  <div className="retro-text text-xl text-white">{stat.value}</div>
                  <div className={`text-xs ${stat.change.startsWith('+') ? 'text-green-400' : 'text-gray-400'}`}>{stat.change}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="metadata-label">Crypto Aggregators</h3>
            <div className="space-y-2">
              {['CoinGecko', 'CoinMarketCap', 'DeFiLlama', 'Dune Analytics'].map((agg) => (
                <div key={agg} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-cyan-500/20">
                  <span className="retro-text text-sm">{agg}</span>
                  <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="metadata-label">NFT Aggregators</h3>
            <div className="space-y-2">
              {['OpenSea', 'Blur', 'LooksRare', 'X2Y2', 'Rarible'].map((agg) => (
                <div key={agg} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-purple-500/20">
                  <span className="retro-text text-sm">{agg}</span>
                  <Badge className="bg-purple-500/20 text-purple-400">Indexed</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="metadata-label">API Endpoints</h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black/40 rounded font-mono text-cyan-400">/api/v1/tracks</div>
              <div className="p-2 bg-black/40 rounded font-mono text-cyan-400">/api/v1/nfts</div>
              <div className="p-2 bg-black/40 rounded font-mono text-cyan-400">/api/v1/listings</div>
              <div className="p-2 bg-black/40 rounded font-mono text-cyan-400">/api/v1/portfolio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Track Card with Audio Playback
function TrackCard({ track, onPlay, isPlaying, isCurrentTrack }: {
  track: any;
  onPlay: () => void;
  isPlaying: boolean;
  isCurrentTrack: boolean;
}) {
  return (
    <Card className={`retro-card transition-all duration-200 hover:border-cyan-400/50 ${isCurrentTrack ? 'border-cyan-400/70 bg-cyan-500/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img src={track.artworkUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'} alt={track.title} className="w-full h-full object-cover" />
            <Button
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
            >
              {isPlaying && isCurrentTrack ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="retro-text text-white truncate">{track.title}</h4>
            <p className="text-sm text-gray-400 truncate">{track.artist}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-cyan-400">{track.playbackCountFormatted || '0'} plays</span>
              {track.listingItem?.price && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  {track.listingItem.price} {track.listingItem.acceptsOGUN ? 'OGUN' : 'MATIC'}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-red-500/20">
            <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to linkify URLs in text (for description and utility fields)
// URLs in description/utility become clickable links for artist marketing
const linkifyText = (text: string) => {
  if (!text) return null
  const urlRegex = /(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-&?=%.]+/g
  const urls = text.match(urlRegex)
  const contentSplit = text.split(urlRegex)

  return contentSplit.map((partialContent, idx) => {
    if (urls && urls.length > idx) {
      const normalizedUrl =
        !urls[idx].startsWith('http://') && !urls[idx].startsWith('https://') ? 'https://' + urls[idx] : urls[idx]
      return (
        <span key={idx}>
          {partialContent}
          <a href={normalizedUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
            {urls[idx]}
          </a>
        </span>
      )
    }
    return <span key={idx}>{partialContent}</span>
  })
}

// Props from getServerSideProps for OG meta tags
interface DEXDashboardProps {
  ogData?: {
    type: 'track' | 'profile' | 'playlist' | null
    title?: string
    description?: string
    image?: string
    url?: string
  }
  isBot?: boolean
}

function DEXDashboard({ ogData, isBot }: DEXDashboardProps) {
  // For bots (Discord, Twitter, etc.), render minimal HTML with OG tags only
  // This ensures social media crawlers get proper preview cards
  if (isBot && ogData?.type) {
    const domainUrl = config.domainUrl || 'https://soundchain.io'
    return (
      <>
        <Head>
          <title>{ogData.title || 'SoundChain'}</title>
          <meta name="description" content={ogData.description || 'Web3 Music Platform'} />

          {/* Open Graph - Primary tags for social media previews */}
          <meta property="og:type" content={ogData.type === 'track' ? 'music.song' : 'website'} />
          <meta property="og:title" content={ogData.title || 'SoundChain'} />
          <meta property="og:description" content={ogData.description || 'Web3 Music Platform'} />
          {ogData.image && <meta property="og:image" content={ogData.image} />}
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="1200" />
          <meta property="og:url" content={`${domainUrl}${ogData.url}`} />
          <meta property="og:site_name" content="SoundChain" />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogData.title || 'SoundChain'} />
          <meta name="twitter:description" content={ogData.description || 'Web3 Music Platform'} />
          {ogData.image && <meta name="twitter:image" content={ogData.image} />}
          <meta name="twitter:site" content="@SoundChainFM" />

          {/* oEmbed Discovery */}
          <link
            rel="alternate"
            type="application/json+oembed"
            href={`${domainUrl}/api/oembed?url=${encodeURIComponent(`${domainUrl}${ogData.url}`)}`}
            title={ogData.title || 'SoundChain'}
          />
        </Head>
        <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
          <h1>{ogData.title}</h1>
          <p>{ogData.description}</p>
          {ogData.image && <img src={ogData.image} alt={ogData.title} style={{ maxWidth: '400px' }} />}
          <p><a href={`${domainUrl}${ogData.url}`}>View on SoundChain</a></p>
        </div>
      </>
    )
  }

  const router = useRouter()

  // Parse slug for routing: /dex/explore, /dex/library, /dex/profile/[handle], /dex/track/[id]
  const slug = router.query.slug as string[] | undefined
  const routeType = slug?.[0] || 'home' // First segment: explore, library, profile, track, etc.
  const routeId = slug?.[1] || null     // Second segment: profile handle or track id

  // Legacy UI Modal Hooks
  const { dispatchShowCreateModal } = useModalDispatch()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Track if user explicitly navigated to their own profile via /dex/me
  // This ensures isViewingOwnProfile is true even before data loads
  const isExplicitOwnProfileRoute = routeType === 'me'

  // Determine initial view based on URL slug
  const getInitialView = () => {
    switch (routeType) {
      case 'explore': return 'explore'
      case 'library': return 'library'
      case 'profile': return 'profile'
      case 'me': return 'profile' // /dex/me -> own profile (forces isViewingOwnProfile = true)
      case 'track': return 'track'
      case 'post': return 'post' // /dex/post/:id -> single post view
      case 'playlist': return 'playlist'
      case 'staking': return 'staking'
      case 'marketplace': return 'marketplace'
      case 'feed': return 'feed'
      case 'dashboard': return 'dashboard' // /dex/dashboard -> dashboard view with genres/leaderboards
      case 'announcements': return 'announcements'
      case 'wallet': return 'wallet'
      case 'settings': return 'settings'
      case 'messages': return 'messages'
      case 'notifications': return 'notifications'
      case 'feedback': return 'feedback'
      case 'admin': return 'admin'
      case 'users': return routeId ? 'profile' : 'users' // /dex/users/handle -> profile view
      case 'home': return 'feed' // Default /dex to feed
      default: return 'feed' // Feed is the default landing view
    }
  }

  const [selectedView, setSelectedView] = useState<'marketplace' | 'feed' | 'dashboard' | 'explore' | 'library' | 'playlist' | 'staking' | 'profile' | 'track' | 'post' | 'wallet' | 'settings' | 'messages' | 'notifications' | 'users' | 'feedback' | 'admin' | 'announcements'>(getInitialView())
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'tracks' | 'nft' | 'token' | 'bundle'>('tracks')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showBackendPanel, setShowBackendPanel] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showGuestPostModal, setShowGuestPostModal] = useState(false)
  const [showWinWinStatsModal, setShowWinWinStatsModal] = useState(false)
  const [showDMModal, setShowDMModal] = useState(false)
  const [showVibesModal, setShowVibesModal] = useState(false)
  const [winWinRewardsTab, setWinWinRewardsTab] = useState<'catalog' | 'listener'>('catalog')
  const [profileImageError, setProfileImageError] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)
  const [exploreSearchQuery, setExploreSearchQuery] = useState('')
  const [exploreTab, setExploreTab] = useState<'tracks' | 'users'>('users')
  const [tracksViewMode, setTracksViewMode] = useState<'browse' | 'leaderboard'>('browse')
  const [usersViewMode, setUsersViewMode] = useState<'browse' | 'leaderboard'>('browse')

  // Users grid scroll position restoration
  useEffect(() => {
    if (selectedView === 'users') {
      // Restore scroll position when returning to Users view
      const savedScrollY = sessionStorage.getItem('usersGridScrollY')
      if (savedScrollY) {
        // Delay to allow content to render
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollY, 10))
          sessionStorage.removeItem('usersGridScrollY')
        }, 100)
      }
    }
  }, [selectedView])

  // Function to save scroll position before navigating to profile
  const saveUsersScrollPosition = () => {
    sessionStorage.setItem('usersGridScrollY', String(window.scrollY))
  }

  // Messaging state
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')

  // Playlist state
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0] | null>(null)

  // Top 100 NFTs modal state
  const [showTop100Modal, setShowTop100Modal] = useState(false)

  // Profile tab state (Feed | Music | Playlists)
  const [profileTab, setProfileTab] = useState<'feed' | 'music' | 'playlists'>('feed')

  // Announcements state (from /v1/feed API)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  // NFT Transfer state
  const [transferRecipient, setTransferRecipient] = useState('')
  const [selectedNftId, setSelectedNftId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Swap state - track selected tokens for dynamic labels
  const [swapFromToken, setSwapFromToken] = useState<Token>('MATIC')
  const [swapToToken, setSwapToToken] = useState<Token>('OGUN')
  const [swapFromAmount, setSwapFromAmount] = useState('')

  // Sync selectedView with URL changes (for back/forward navigation)
  // Also sync when router becomes ready (router.query is empty until ready)
  // IMPORTANT: Must include routeId so /dex/users → /dex/users/handle triggers view change
  useEffect(() => {
    if (!router.isReady) return
    const newView = getInitialView()
    if (newView !== selectedView && ['explore', 'library', 'profile', 'track', 'playlist', 'staking', 'marketplace', 'feed', 'dashboard', 'wallet', 'settings', 'messages', 'notifications', 'users', 'announcements'].includes(newView)) {
      console.log('🔄 Syncing view:', { from: selectedView, to: newView, routeType, routeId, isReady: router.isReady })
      setSelectedView(newView as any)
    }
  }, [routeType, routeId, router.isReady])

  // Fetch announcements from /v1/feed API
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const response = await fetch('https://19ne212py4.execute-api.us-east-1.amazonaws.com/production/v1/feed?limit=5')
        if (response.ok) {
          const data = await response.json()
          setAnnouncements(data.announcements || [])
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setAnnouncementsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

  // Restore wallet connection from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem('connectedWalletAddress')
      const savedType = localStorage.getItem('connectedWalletType')
      if (savedAddress && savedType) {
        setConnectedWallet(savedAddress)
        setIsWalletConnected(true)
        console.log(`🔄 Restored wallet: ${savedType} - ${savedAddress}`)
      }
    }
  }, [])

  // Navigate to a view and update URL
  const navigateToView = useCallback((view: string, id?: string) => {
    if (view === 'dashboard' || view === 'home') {
      router.push('/dex', undefined, { shallow: true })
    } else if (id) {
      router.push(`/dex/${view}/${id}`, undefined, { shallow: true })
    } else {
      router.push(`/dex/${view}`, undefined, { shallow: true })
    }
  }, [router])

  // Audio Player Context
  const { play, playlistState, isPlaying, currentSong, togglePlay } = useAudioPlayerContext()

  // Magic Wallet Context - Real balances from blockchain
  const { balance: maticBalance, ogunBalance, account: walletAccount, web3: magicWeb3, refetchBalance } = useMagicContext()

  // State for staked OGUN balance (separate from liquid balance)
  const [stakedOgunBalance, setStakedOgunBalance] = useState<string>('0')

  // Fetch staked OGUN balance from staking contract
  useEffect(() => {
    const fetchStakedBalance = async () => {
      if (!magicWeb3 || !walletAccount || !tokenStakeContractAddress) return
      try {
        const stakingContract = getStakingContract(magicWeb3)
        const balanceData = await stakingContract.methods.getBalanceOf(walletAccount).call() as [string, string, string] | undefined
        if (balanceData) {
          const [stakedAmount] = balanceData
          const validStaked = stakedAmount !== undefined && (typeof stakedAmount === 'string' || typeof stakedAmount === 'number')
            ? stakedAmount.toString()
            : '0'
          const formattedStaked = magicWeb3.utils.fromWei(validStaked, 'ether')
          setStakedOgunBalance(Number(formattedStaked).toFixed(6))
        }
      } catch (error: any) {
        // User hasn't staked - this is expected for most users
        if (!error.toString().includes("address hasn't stake any tokens yet")) {
          console.log('Error fetching staked balance:', error)
        }
        setStakedOgunBalance('0')
      }
    }
    fetchStakedBalance()
  }, [magicWeb3, walletAccount])

  // Refetch balances when wallet view is selected
  useEffect(() => {
    if (selectedView === 'wallet' && refetchBalance) {
      console.log('💰 Wallet view selected, refreshing balances...')
      refetchBalance()
    }
  }, [selectedView, refetchBalance])

  // Transaction history query for wallet activity
  const { data: maticUsdData } = useMaticUsdQuery()
  const { data: transactionData, loading: transactionsLoading } = usePolygonscanQuery({
    variables: {
      wallet: walletAccount || '',
      page: { first: 10 },
    },
    skip: !walletAccount, // Only fetch when wallet is connected
  })

  // Unified Wallet Context - synced across all pages (includes Web3Modal)
  const {
    activeWalletType,
    activeAddress,
    activeBalance,
    activeOgunBalance,
    isConnected: isUnifiedWalletConnected,
    chainName,
    connectWeb3Modal: openWeb3Modal,
    disconnectWallet: unifiedDisconnectWallet,
    isWeb3ModalReady,
  } = useUnifiedWallet()

  // For backwards compatibility
  const web3ModalAddress = activeWalletType === 'web3modal' ? activeAddress : null
  const isWeb3ModalConnected = activeWalletType === 'web3modal' && isUnifiedWalletConnected

  // Create+ Button Handler - Supports both members and guests
  const handleCreateClick = () => {
    if (me) {
      // Logged in member - use regular create modal with post tab
      dispatchShowCreateModal(true, 'post')
    } else if (isWalletConnected && connectedWallet) {
      // Guest with wallet connected - show guest post modal
      setShowGuestPostModal(true)
    } else {
      // No wallet, no account - prompt wallet connection
      setShowWalletModal(true)
    }
  }

  // Disconnect wallet handler
  const handleWalletDisconnect = () => {
    setIsWalletConnected(false)
    setConnectedWallet(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('connectedWalletAddress')
      localStorage.removeItem('connectedWalletType')
    }
    console.log('🔌 Wallet disconnected')
  }

  // Logout handler - clear all auth tokens to prevent auto-login
  const onLogout = async () => {
    try {
      // Clear all auth tokens from localStorage
      localStorage.removeItem('didToken')
      localStorage.removeItem('jwt_fallback')
      localStorage.removeItem('connectedWalletAddress')
      localStorage.removeItem('connectedWalletType')

      // Clear JWT cookie and Apollo cache
      await setJwt()

      // Force full page reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Force reload even on error to ensure user is logged out
      window.location.href = '/login'
    }
  }

  // Real SoundChain data - YOUR profile (only fetch if needed, use cache-first for speed)
  const { data: userData, loading: userLoading, error: userError } = useMeQuery({
    ssr: false,
    fetchPolicy: 'cache-first', // Speed: use cache, don't hit network unless stale
  })

  // Fetch user's streaming rewards data for PiggyBank accordion modal
  const { data: myStreamingRewardsData, loading: myStreamingRewardsLoading } = useQuery(PROFILE_STREAMING_REWARDS_QUERY, {
    variables: { profileId: userData?.me?.profile?.id || '' },
    skip: !userData?.me?.profile?.id,
    fetchPolicy: 'cache-first',
  })

  // Calculate total earnings from all tracks
  const myTotalOgunEarned = React.useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => {
      return total + (scid.ogunRewardsEarned || 0)
    }, 0)
  }, [myStreamingRewardsData])

  const myTotalStreams = React.useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => {
      return total + (scid.streamCount || 0)
    }, 0)
  }, [myStreamingRewardsData])

  // GraphQL query for tracks by genre (Spotify-style horizontal scrolling)
  // Note: Simplified query - only request fields that exist in Track model
  const TRACKS_BY_GENRE_QUERY = gql`
    query TracksByGenre($limit: Float) {
      tracksByGenre(limit: $limit) {
        genre
        tracks {
          id
          title
          artworkUrl
          playbackUrl
          genres
          playbackCount
          favoriteCount
          createdAt
        }
      }
    }
  `

  // Fetch tracks grouped by genre for the new Spotify-style UI
  // Only fetch when on dashboard view with tracks tab selected for SPEED
  const { data: genreTracksData, loading: genreTracksLoading, error: genreTracksError, refetch: refetchGenreTracks } = useQuery(TRACKS_BY_GENRE_QUERY, {
    variables: { limit: 8 }, // Reduced from 15 to 8 to prevent Lambda timeout
    fetchPolicy: 'cache-first', // Speed: use cache, skip network when possible
    errorPolicy: 'all', // Return partial data on error
    skip: selectedView !== 'dashboard', // SPEED: Only fetch when on dashboard
  })

  // Fetch Top 10 most streamed tracks for the Top Charts section
  // SPEED: Only fetch when on dashboard, use cache-first
  const { data: topTracksData, loading: topTracksLoading } = useTracksQuery({
    variables: {
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
      page: { first: 10 },
    },
    fetchPolicy: 'cache-first', // Speed: cache first, no network hit if cached
    skip: selectedView !== 'dashboard', // SPEED: Only fetch when needed
  })

  // Fetch Top 100 NFT tracks for the Top 100 modal (fetch more to ensure 100 NFTs after filtering)
  const { data: top100TracksData, loading: top100TracksLoading } = useTracksQuery({
    variables: {
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
      page: { first: 200 },
    },
    fetchPolicy: 'cache-first',
    skip: !showTop100Modal, // Only fetch when modal is open
  })

  // Filter for NFT tracks only and limit to 100
  const top100NftTracks = React.useMemo(() => {
    return (top100TracksData?.tracks?.nodes || [])
      .filter((track: any) => track.nftData?.tokenId || track.nftData?.contract)
      .slice(0, 100)
  }, [top100TracksData])

  // Fetch ALL unique tracks (618 tracks from 8,236 NFT editions) with pagination
  // SPEED: Only fetch when on dashboard, cache-first
  const { data: tracksData, loading: tracksLoading, error: tracksError, refetch: refetchTracks, fetchMore: fetchMoreTracks } = useGroupedTracksQuery({
    variables: {
      filter: {}, // Empty filter to get ALL tracks
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 20 }, // Start with 20 tracks for smooth rendering
    },
    skip: selectedView !== 'dashboard', // SPEED: Only fetch when on dashboard
    fetchPolicy: 'cache-first', // Speed: cache-first for instant loads
    notifyOnNetworkStatusChange: true, // Get updates on refetch
  })

  // Fetch USER-OWNED NFTs for wallet page AND library - filter by wallet address
  // FIX: defaultWallet is an ENUM (Soundchain/MetaMask), NOT the actual 0x address!
  // Must use magicWalletAddress for the actual blockchain address
  const walletAddress = userData?.me?.magicWalletAddress
  const { data: ownedTracksData, loading: ownedTracksLoading, error: ownedTracksError } = useGroupedTracksQuery({
    variables: {
      filter: walletAddress ? { nftData: { owner: walletAddress } } : {},
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 50 }, // Load more for wallet/library view
    },
    skip: (selectedView !== 'wallet' && selectedView !== 'library') || !walletAddress, // Fetch on wallet and library pages
    fetchPolicy: 'cache-and-network', // Fresher data for owned NFTs
  })

  // Track if we're loading more
  const [loadingMore, setLoadingMore] = useState(false)

  // Load more tracks using cursor pagination with deduplication
  const handleLoadMore = useCallback(async () => {
    if (!tracksData?.groupedTracks?.pageInfo?.hasNextPage || loadingMore) return

    setLoadingMore(true)
    try {
      await fetchMoreTracks({
        variables: {
          page: {
            first: 20,
            after: tracksData.groupedTracks.pageInfo.endCursor,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev

          // Deduplicate: only add nodes that don't already exist
          const existingIds = new Set(prev.groupedTracks?.nodes?.map((n: any) => n.id) || [])
          const newNodes = (fetchMoreResult.groupedTracks?.nodes || []).filter(
            (node: any) => !existingIds.has(node.id)
          )

          console.log('📦 Load More:', {
            existing: prev.groupedTracks?.nodes?.length || 0,
            fetched: fetchMoreResult.groupedTracks?.nodes?.length || 0,
            newUnique: newNodes.length,
            cursor: fetchMoreResult.groupedTracks?.pageInfo?.endCursor
          })

          return {
            ...fetchMoreResult,
            groupedTracks: {
              ...fetchMoreResult.groupedTracks,
              nodes: [
                ...(prev.groupedTracks?.nodes || []),
                ...newNodes,
              ],
            },
          }
        },
      })
    } catch (err) {
      console.error('Error loading more tracks:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [tracksData, fetchMoreTracks, loadingMore])

  // FORCE REFETCH on mount to bypass any cache issues
  useEffect(() => {
    console.log('🚀 FORCING TRACKS REFETCH ON MOUNT')
    refetchTracks()
  }, []) // Empty deps = run once on mount

  // AUTO-LOAD ALL TRACKS: Load up to totalCount then STOP
  // CRITICAL: Removed aggressive auto-loading - was causing infinite loop and memory leak
  // Now only logs progress, manual "Load More" button handles pagination
  const tracksLoadedRef = useRef(0)
  useEffect(() => {
    const currentCount = tracksData?.groupedTracks?.nodes?.length || 0
    const totalCount = tracksData?.groupedTracks?.pageInfo?.totalCount || 0

    // Only log if we have new data
    if (currentCount > tracksLoadedRef.current) {
      tracksLoadedRef.current = currentCount
      console.log(`✅ Tracks loaded: ${currentCount}/${totalCount}`)
    }
    // NO AUTO-LOADING - let user click "Load More" button
    // Previous auto-loading caused infinite loop
  }, [tracksData?.groupedTracks?.nodes?.length])

  // Log only errors (reduced logging for performance)
  useEffect(() => {
    if (tracksError) {
      console.error('🚨 TRACKS ERROR:', tracksError.message)
    }
  }, [tracksError])

  // Fetch all listing items for marketplace with pagination
  // SPEED: Only fetch when on marketplace or dashboard, cache-first
  const { data: listingData, loading: listingLoading, error: listingError, fetchMore: fetchMoreListings, refetch: refetchListings } = useListingItemsQuery({
    variables: { page: { first: 50 }, sort: SelectToApolloQuery[SortListingItem.PriceDesc], filter: {} }, // Sort by price DESC to show priced items first
    ssr: false,
    fetchPolicy: 'cache-first', // Speed: cache-first for instant loads
    errorPolicy: 'all', // Allow partial data even with errors
    skip: selectedView !== 'marketplace' && selectedView !== 'dashboard', // SPEED: Only fetch when needed
  })

  // Load more listings
  const [loadingMoreListings, setLoadingMoreListings] = useState(false)
  const handleLoadMoreListings = useCallback(async () => {
    if (!listingData?.listingItems?.pageInfo?.hasNextPage || loadingMoreListings) return
    setLoadingMoreListings(true)
    try {
      await fetchMoreListings({
        variables: {
          page: { first: 20, after: listingData.listingItems.pageInfo.endCursor },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            ...fetchMoreResult,
            listingItems: {
              ...fetchMoreResult.listingItems,
              nodes: [...(prev.listingItems?.nodes || []), ...(fetchMoreResult.listingItems?.nodes || [])],
            },
          }
        },
      })
    } catch (err) {
      console.error('Error loading more listings:', err)
    } finally {
      setLoadingMoreListings(false)
    }
  }, [listingData, fetchMoreListings, loadingMoreListings])

  // AUTO-LOAD ALL LISTINGS: Disabled - was causing 502 errors and performance issues
  // User can click "Load More" button for pagination
  const listingsLoadedRef = useRef(0)
  useEffect(() => {
    const currentCount = listingData?.listingItems?.nodes?.length || 0
    const totalCount = listingData?.listingItems?.pageInfo?.totalCount || 0

    if (currentCount > listingsLoadedRef.current) {
      listingsLoadedRef.current = currentCount
      console.log(`✅ Listings loaded: ${currentCount}/${totalCount}`)
    }
    // NO AUTO-LOADING - let user click "Load More" button
    // Previous auto-loading caused 502 errors from backend overload
  }, [listingData?.listingItems?.nodes?.length])

  // Infinite scroll refs - DISABLED to prevent 502 errors and performance issues
  // Users click "Load More" button for pagination instead
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  const nftScrollRef = useRef<HTMLDivElement>(null)
  const listingsScrollRef = useRef<HTMLDivElement>(null)
  // NOTE: All IntersectionObserver auto-loaders removed - they were causing:
  // 1. Infinite loading loops
  // 2. 502 backend errors from too many requests
  // 3. Memory leaks from exponential data growth
  // Manual "Load More" buttons are used instead

  // Explore Users Query - search for users/profiles
  // Load users with pagination - API max is 200 per page
  const { data: exploreUsersData, loading: exploreUsersLoading, error: exploreUsersError, refetch: refetchUsers, fetchMore: fetchMoreUsers } = useExploreUsersQuery({
    variables: {
      search: exploreSearchQuery.trim() || undefined, // Search works in both users view and explore view
      page: { first: 200 } // Load 200 users at once (max allowed by API)
    },
    skip: selectedView !== 'explore' && selectedView !== 'users',
    fetchPolicy: 'cache-and-network', // Use cache but also fetch fresh
    notifyOnNetworkStatusChange: true,
  })

  // State for loading more users
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false)

  // Function to load more users
  const handleLoadMoreUsers = async () => {
    if (!exploreUsersData?.exploreUsers?.pageInfo?.hasNextPage || loadingMoreUsers) return

    setLoadingMoreUsers(true)
    try {
      await fetchMoreUsers({
        variables: {
          page: {
            first: 200,
            after: exploreUsersData.exploreUsers.pageInfo.endCursor
          }
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev

          // Deduplicate nodes by ID when merging
          const existingIds = new Set(prev.exploreUsers?.nodes?.map((n: any) => n.id) || [])
          const newNodes = fetchMoreResult.exploreUsers?.nodes?.filter((n: any) => !existingIds.has(n.id)) || []

          return {
            ...fetchMoreResult,
            exploreUsers: {
              ...fetchMoreResult.exploreUsers,
              nodes: [
                ...(prev.exploreUsers?.nodes || []),
                ...newNodes
              ]
            }
          }
        }
      })
    } catch (err) {
      console.error('Error loading more users:', err)
    } finally {
      setLoadingMoreUsers(false)
    }
  }

  // Debug: Log users query state
  useEffect(() => {
    if (selectedView === 'users') {
      console.log('👥 Users Query State:', {
        loading: exploreUsersLoading,
        error: exploreUsersError?.message,
        dataExists: !!exploreUsersData,
        nodeCount: exploreUsersData?.exploreUsers?.nodes?.length,
        selectedView
      })
    }
  }, [selectedView, exploreUsersLoading, exploreUsersError, exploreUsersData])

  // Chats/Messages Query - fetch all conversations
  const { data: chatsData, loading: chatsLoading, refetch: refetchChats } = useChatsQuery({
    skip: selectedView !== 'messages' || !userData?.me,
    fetchPolicy: 'cache-and-network',
  })

  // Lazy query for loading chat history when a conversation is selected
  const [loadChatHistory, { data: chatHistoryData, loading: chatHistoryLoading }] = useChatHistoryLazyQuery({
    fetchPolicy: 'cache-and-network',
  })

  // Send message mutation
  const [sendMessage, { loading: sendingMessage }] = useSendMessageMutation({
    onCompleted: () => {
      setMessageInput('')
      refetchChats()
      if (selectedChatId) {
        loadChatHistory({ variables: { profileId: selectedChatId } })
      }
    }
  })

  // Load chat history when a conversation is selected
  useEffect(() => {
    if (selectedChatId && selectedView === 'messages') {
      loadChatHistory({ variables: { profileId: selectedChatId } })
    }
  }, [selectedChatId, selectedView, loadChatHistory])

  // Explore Tracks Query - search for tracks
  // SPEED: cache-first, only fetch when on explore view
  const { data: exploreTracksData, loading: exploreTracksLoading } = useExploreTracksQuery({
    variables: {
      search: exploreSearchQuery.trim() || undefined,
      page: { first: 20 }
    },
    skip: selectedView !== 'explore',
    fetchPolicy: 'cache-first', // Speed: instant from cache
  })

  // Favorite Tracks Query - for Library view
  const { data: favoriteTracksData, loading: favoriteTracksLoading } = useFavoriteTracksQuery({
    variables: {
      page: { first: 50 }
    },
    skip: selectedView !== 'library' || !userData?.me,
    fetchPolicy: 'cache-and-network',
  })

  // Notifications Query - for Notifications view
  const { data: notificationsData, loading: notificationsLoading } = useNotificationsQuery({
    skip: selectedView !== 'notifications' || !userData?.me,
    fetchPolicy: 'cache-and-network',
  })

  // Follow/Unfollow mutations
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation()
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation()
  const [toggleFavorite] = useToggleFavoriteMutation()

  // Track Detail Query - fetch single track when viewing /dex/track/[id]
  const { data: trackDetailData, loading: trackDetailLoading, error: trackDetailError } = useTrackQuery({
    variables: { id: routeId || '' },
    skip: selectedView !== 'track' || !routeId,
    fetchPolicy: 'cache-and-network',
  })

  // Post Detail Query - fetch single post when viewing /dex/post/[id]
  const { data: postDetailData, loading: postDetailLoading, error: postDetailError } = usePostQuery({
    variables: { id: routeId || '' },
    skip: selectedView !== 'post' || !routeId,
    fetchPolicy: 'cache-and-network',
  })

  // SCid Query - fetch SoundChain ID for track
  const { data: scidData } = useQuery(SCID_BY_TRACK_QUERY, {
    variables: { trackId: routeId || '' },
    skip: selectedView !== 'track' || !routeId,
    fetchPolicy: 'cache-and-network',
  })

  // Profile Detail Query - fetch single profile when viewing /dex/profile/[id]
  const { data: profileDetailData, loading: profileDetailLoading, error: profileDetailError } = useProfileQuery({
    variables: { id: routeId || '' },
    skip: selectedView !== 'profile' || !routeId || routeType === 'users',
    fetchPolicy: 'cache-and-network',
  })

  // Profile By Handle Query - fetch profile by userHandle when viewing /dex/users/[handle]
  const { data: profileByHandleData, loading: profileByHandleLoading, error: profileByHandleError } = useProfileByHandleQuery({
    variables: { handle: routeId || '' },
    skip: selectedView !== 'profile' || !routeId || routeType !== 'users',
    fetchPolicy: 'cache-and-network',
  })

  // Merge profile data from either query source
  // IMPORTANT: This MUST be defined BEFORE isViewingOwnProfile which depends on it
  // PRIORITY: If /dex/me route, use current user's profile (no external query needed)
  const viewingProfile = isExplicitOwnProfileRoute
    ? (userData?.me?.profile || me?.profile)  // /dex/me -> own profile from user data
    : (profileDetailData?.profile || profileByHandleData?.profileByHandle)  // /dex/users/handle -> queried profile
  const viewingProfileLoading = isExplicitOwnProfileRoute
    ? userLoading
    : (profileDetailLoading || profileByHandleLoading)
  const viewingProfileError = isExplicitOwnProfileRoute
    ? userError
    : (profileDetailError || profileByHandleError)

  // Query to get track count for viewed profile
  const { data: viewingProfileTracksData } = useGroupedTracksQuery({
    variables: {
      filter: { profileId: viewingProfile?.id },
      page: { first: 1 }, // Only need count, not actual tracks
    },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-first',
  })
  const viewingProfileTrackCount = viewingProfileTracksData?.groupedTracks?.pageInfo?.totalCount || 0

  // Query to get full track list for viewed profile's NFT modal
  const { data: viewingProfileNFTsData } = useGroupedTracksQuery({
    variables: {
      filter: { profileId: viewingProfile?.id },
      page: { first: 100 }, // Get tracks for NFT modal
    },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-first',
  })

  // Transform tracks to NFT collection format
  const viewingProfileNFTs = viewingProfileNFTsData?.groupedTracks?.nodes?.map((t: any) => ({
    id: t.id,
    title: t.title || 'Untitled',
    artist: t.artist || t.profile?.displayName || 'Unknown Artist',
    artworkUrl: t.artworkMedia?.url || t.coverMedia?.url || t.artworkUrl,
    audioUrl: t.streamMedia?.url || t.audioMedia?.url,
    tokenId: t.tokenId,
    chain: 'Polygon',
  })) || []

  // Query to get followers list for viewed profile
  const { data: viewingProfileFollowersData } = useFollowersQuery({
    variables: {
      profileId: viewingProfile?.id || '',
      page: { first: 100 },
    },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-first',
  })

  // Query to get following list for viewed profile
  const { data: viewingProfileFollowingData } = useFollowingQuery({
    variables: {
      profileId: viewingProfile?.id || '',
      page: { first: 100 },
    },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-first',
  })

  // Transform followers data for ProfileHeader (filter out null profiles)
  const followersList = viewingProfileFollowersData?.followers?.nodes
    ?.filter(f => f?.followerProfile)
    ?.map(f => ({
      id: f.followerProfile.id,
      name: f.followerProfile.displayName || f.followerProfile.userHandle,
      username: `@${f.followerProfile.userHandle}`,
      userHandle: f.followerProfile.userHandle, // For navigation
      avatar: f.followerProfile.profilePicture || undefined,
      isVerified: f.followerProfile.verified || f.followerProfile.teamMember || false,
    })) || []

  // Transform following data for ProfileHeader (filter out null profiles)
  const followingList = viewingProfileFollowingData?.following?.nodes
    ?.filter(f => f?.followedProfile)
    ?.map(f => ({
      id: f.followedProfile.id,
      name: f.followedProfile.displayName || f.followedProfile.userHandle,
      username: `@${f.followedProfile.userHandle}`,
      userHandle: f.followedProfile.userHandle, // For navigation
      avatar: f.followedProfile.profilePicture || undefined,
      isVerified: f.followedProfile.verified || f.followedProfile.teamMember || false,
    })) || []

  // Playlists Query - for Playlist view, Library view, AND profile playlists tab (uses JWT auth to determine user)
  // NOTE: isViewingOwnProfile uses viewingProfile which is now defined above
  // Using String() for robust comparison - IDs may be ObjectId vs string
  // Multiple fallbacks: profile ID, wallet address, userHandle
  const myProfileId = me?.profile?.id || userData?.me?.profile?.id
  // Get wallet from ANY OAuth method - not just magicWalletAddress
  const myWalletAddress = (
    userData?.me?.magicWalletAddress ||
    userData?.me?.googleWalletAddress ||
    userData?.me?.discordWalletAddress ||
    userData?.me?.twitchWalletAddress ||
    userData?.me?.emailWalletAddress
  )?.toLowerCase()
  const myUserHandle = me?.profile?.userHandle || userData?.me?.profile?.userHandle

  // Debug: Log comparison values (remove after debugging)
  if (selectedView === 'profile' && (viewingProfile?.id || isExplicitOwnProfileRoute)) {
    console.log('🔍 isViewingOwnProfile debug:', {
      isExplicitOwnProfileRoute,
      myProfileId,
      viewingProfileId: viewingProfile?.id,
      idsMatch: String(viewingProfile?.id) === String(myProfileId),
      myUserHandle,
      viewingUserHandle: viewingProfile?.userHandle,
      handlesMatch: myUserHandle === viewingProfile?.userHandle,
    })
  }

  // Check if viewing own profile
  // PRIORITY: If user navigated to /dex/me, they ARE viewing their own profile (no comparison needed)
  // Otherwise, try multiple comparisons
  const isViewingOwnProfile = selectedView === 'profile' && (
    // EXPLICIT: User navigated to /dex/me - this IS their own profile
    isExplicitOwnProfileRoute ||
    // COMPARISON: Check if viewingProfile matches logged-in user
    (Boolean(viewingProfile?.id) && (
      // Primary: Compare profile IDs (most reliable)
      (Boolean(myProfileId) && String(viewingProfile?.id) === String(myProfileId)) ||
      // Fallback 1: Compare wallet addresses (Profile only has magicWalletAddress)
      (Boolean(myWalletAddress) && Boolean(viewingProfile?.magicWalletAddress) &&
        myWalletAddress === viewingProfile.magicWalletAddress?.toLowerCase()) ||
      // Fallback 2: Compare userHandles (very reliable)
      (Boolean(myUserHandle) && Boolean(viewingProfile?.userHandle) &&
        myUserHandle === viewingProfile.userHandle)
    ))
  )
  const shouldSkipPlaylists = (selectedView !== 'playlist' && selectedView !== 'library' && !isViewingOwnProfile) || !userData?.me
  const { data: playlistsData, loading: playlistsLoading, error: playlistsError, refetch: refetchPlaylists } = useGetUserPlaylistsQuery({
    variables: {},
    skip: shouldSkipPlaylists,
    fetchPolicy: 'network-only', // Always fetch fresh, don't use cache
    errorPolicy: 'all', // Return partial data even if there are errors
  })

  // Handle follow toggle
  const handleFollowToggle = async (profileId: string, isFollowed: boolean, handle: string) => {
    if (!me) {
      router.push('/login')
      return
    }
    if (followLoading || unfollowLoading) return
    const mutation = isFollowed ? unfollowProfile : followProfile
    await mutation({ variables: { input: { followedId: profileId } } })
  }

  // Handle NFT Transfer - calls smart contract
  const handleTransferNFT = async () => {
    if (!transferRecipient || !selectedNftId || !userWallet) {
      alert('Please enter a recipient address and select an NFT')
      return
    }
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(transferRecipient)) {
      alert('Invalid wallet address. Please enter a valid Ethereum address.')
      return
    }
    if (transferRecipient.toLowerCase() === userWallet.toLowerCase()) {
      alert('Cannot transfer to yourself')
      return
    }
    setTransferring(true)
    try {
      // TODO: Implement actual NFT transfer via smart contract
      // This will call the Soundchain721 or Soundchain1155 contract
      console.log('🔄 Transferring NFT:', { nftId: selectedNftId, to: transferRecipient })
      alert(`NFT transfer initiated!\n\nNFT: ${selectedNftId}\nTo: ${transferRecipient}\n\nThis feature requires wallet signing - coming soon!`)
      // Reset form on success
      setTransferRecipient('')
      setSelectedNftId('')
    } catch (err: any) {
      console.error('❌ NFT Transfer error:', err)
      alert(`Transfer failed: ${err.message || 'Unknown error'}`)
    } finally {
      setTransferring(false)
    }
  }

  // Posts are now handled by the Posts component directly - no need for custom query

  // Handle errors with useEffect (onError is deprecated in Apollo v3.14+)
  useEffect(() => {
    if (userError) {
      console.error('❌ useMeQuery Error:', userError)
      console.error('Error details:', {
        message: userError.message,
        graphQLErrors: userError.graphQLErrors,
        networkError: userError.networkError,
      })
    }
  }, [userError])

  useEffect(() => {
    if (tracksError) {
      console.error('❌ useGroupedTracksQuery Error:', tracksError)
    }
  }, [tracksError])

  // Auto-retry on 502 errors (Lambda timeout) - once after 2 seconds
  const [listingRetried, setListingRetried] = useState(false)
  const [genreRetried, setGenreRetried] = useState(false)

  useEffect(() => {
    if (listingError) {
      console.error('❌ useListingItemsQuery Error:', listingError)
      // Auto-retry once on 502 error
      if (!listingRetried && listingError.message?.includes('502')) {
        console.log('🔄 Retrying listing query in 2s...')
        setListingRetried(true)
        setTimeout(() => refetchListings(), 2000)
      }
    }
  }, [listingError, listingRetried, refetchListings])

  useEffect(() => {
    if (genreTracksError) {
      console.error('❌ Genre Tracks Query Error:', genreTracksError)
      // Auto-retry once on 502 error
      if (!genreRetried && genreTracksError.message?.includes('502')) {
        console.log('🔄 Retrying genre tracks query in 2s...')
        setGenreRetried(true)
        setTimeout(() => refetchGenreTracks(), 2000)
      }
    }
  }, [genreTracksError, genreRetried, refetchGenreTracks])

  // User profile from GraphQL - REAL DATA
  const user = userData?.me?.profile
  // FIX: defaultWallet is ENUM, use magicWalletAddress for actual 0x address
  const userWallet = userData?.me?.magicWalletAddress
  const userTracks = tracksData?.groupedTracks?.nodes || []
  const ownedTracks = ownedTracksData?.groupedTracks?.nodes || [] // User-owned NFTs for wallet page
  const marketTracks = listingData?.listingItems?.nodes || []

  // Debug badge display
  if (typeof window !== 'undefined' && user) {
    console.log('🏆 Badge Data:', {
      userHandle: user.userHandle,
      teamMember: user.teamMember,
      verified: user.verified,
      badges: user.badges,
      followerCount: user.followerCount,
      tracksCount: userTracks.length,
    })
  }

  // Debug logging - Only log errors (disabled verbose logging for performance)
  if (typeof window !== 'undefined') {
    // Log only errors to avoid console spam
    if (userError) {
      console.error('❌ User query error:', userError.message)
    }
    if (tracksError) {
      console.error('❌ Tracks query error:', tracksError.message)
    }
    if (listingError) {
      console.error('❌ Listing query error:', listingError)
    }
    if (!userData && !userLoading && !userError) {
      console.error('❌ User data failed to load with no error! This is unexpected.')
    }
  }

  const handlePlayTrack = useCallback((track: any, index: number, tracks: any[]) => {
    try {
      if (!track || !tracks?.length) {
        console.error('[handlePlayTrack] Invalid track or tracks array')
        return
      }
      const playlist: Song[] = tracks.map(t => ({
        trackId: t?.id || '',
        src: t?.playbackUrl || '',
        title: t?.title || 'Unknown',
        artist: t?.artist || t?.profile?.displayName || 'Unknown Artist',
        art: t?.artworkUrl || t?.artwork || '',
        isFavorite: t?.isFavorite || false,
      }))
      playlistState(playlist, index)
    } catch (error) {
      console.error('[handlePlayTrack] Error creating playlist:', error)
    }
  }, [playlistState])

  const handleWalletConnect = (address: string, walletType: string) => {
    setIsWalletConnected(true)
    setConnectedWallet(address)
    console.log(`✅ Wallet connected: ${walletType} - ${address}`)

    // Optionally store wallet info in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('connectedWalletAddress', address)
      localStorage.setItem('connectedWalletType', walletType)
    }
  }

  const copyAddress = () => {
    if (userWallet) {
      navigator.clipboard.writeText(userWallet)
    }
  }

  // Filter marketplace tracks by search query
  const filteredMarketTracks = marketTracks.filter((track: any) =>
    !searchQuery ||
    track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* SSR OG Meta Tags for Social Sharing Previews */}
      {ogData?.type && (
        <Head>
          <title>{ogData.title || 'SoundChain'}</title>
          <meta name="description" content={ogData.description || 'Web3 Music Platform'} />

          {/* Open Graph */}
          <meta property="og:type" content={ogData.type === 'track' ? 'music.song' : 'profile'} />
          <meta property="og:title" content={ogData.title || 'SoundChain'} />
          <meta property="og:description" content={ogData.description || 'Web3 Music Platform'} />
          {ogData.image && <meta property="og:image" content={ogData.image} />}
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="1200" />
          <meta property="og:url" content={`${config.domainUrl}${ogData.url}`} />
          <meta property="og:site_name" content="SoundChain" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogData.title || 'SoundChain'} />
          <meta name="twitter:description" content={ogData.description || 'Web3 Music Platform'} />
          {ogData.image && <meta name="twitter:image" content={ogData.image} />}
          <meta name="twitter:site" content="@SoundChainFM" />

          {/* oEmbed Discovery - enables rich embeds in Discord, Slack, etc */}
          <link
            rel="alternate"
            type="application/json+oembed"
            href={`${config.domainUrl}/api/oembed?url=${encodeURIComponent(`${config.domainUrl}${ogData.url}`)}`}
            title={ogData.title || 'SoundChain'}
          />
        </Head>
      )}

    <div className="min-h-screen bg-gray-900 text-white">
      {/* Full-screen Cover Photo Background */}
      <div className="fixed inset-0 z-0">
        {selectedView === 'profile' && viewingProfile?.coverPicture ? (
          /* Viewing another user's profile - show their cover */
          <>
            <img
              src={viewingProfile.coverPicture}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
          </>
        ) : selectedView === 'profile' ? (
          /* Viewing profile but no cover - show gradient */
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-cyan-900 to-black" />
        ) : user?.coverPicture && !coverImageError ? (
          /* Own profile / other views - show logged-in user's cover */
          <>
            <img
              src={user.coverPicture}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={() => {
                console.error('❌ Cover image failed to load:', user.coverPicture)
                setCoverImageError(true)
              }}
              onLoad={() => console.log('✅ Cover image loaded successfully')}
            />
            {/* Subtle gradient only at bottom for content readability - let the cover art shine! */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/60" />
          </>
        ) : (
          <>
            <div className="w-full h-full bg-gradient-to-b from-gray-900 via-black to-gray-900" />
            {user?.coverPicture && coverImageError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs">
                Cover image failed to load
              </div>
            )}
          </>
        )}
      </div>

      {/* REMOVED ScrollingBackground - it was covering user's real cover art with Unsplash placeholders */}

      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className="backdrop-blur-xl bg-gray-900/95 border-b border-cyan-500/20 px-4 lg:px-6 py-2 sticky top-0 z-50 shadow-lg">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center space-x-4 lg:space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <Logo className="h-12 w-12" />
                <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
                  SoundChain
                </span>
              </Link>

              {/* Mobile WIN-WIN and Mint+ buttons - visible on small screens */}
              <div className="flex lg:hidden items-center space-x-1">
                {/* PiggyBank with dropdown accordion */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWinWinStatsModal(!showWinWinStatsModal)}
                    className="hover:bg-pink-500/10 px-2"
                    title="WIN-WIN Streaming Rewards"
                  >
                    <PiggyBank className="w-5 h-5 text-pink-400" />
                  </Button>

                  {/* WIN-WIN Accordion Dropdown - SoundChain Colors */}
                  {showWinWinStatsModal && (
                    <Card className="absolute left-0 top-12 w-80 z-50 shadow-2xl max-h-[80vh] overflow-hidden border-2 border-orange-500/50 bg-gradient-to-b from-neutral-900 via-orange-950/10 to-neutral-900">
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-900/50 to-yellow-900/50">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                              <PiggyBank className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full flex items-center justify-center animate-pulse">
                              <Coins className="w-2 h-2 text-cyan-900" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">WIN-WIN Rewards</h3>
                            <p className="text-[10px] text-cyan-400/80">Stream to Earn OGUN</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowWinWinStatsModal(false)} className="w-6 h-6 p-0 hover:bg-orange-500/20">
                          <X className="w-4 h-4 text-orange-400" />
                        </Button>
                      </div>

                      {/* Tabs: Catalog (Creator) | Listener */}
                      {me && (
                        <div className="flex border-b border-orange-500/20">
                          <button
                            onClick={() => setWinWinRewardsTab('catalog')}
                            className={`flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              winWinRewardsTab === 'catalog'
                                ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500'
                                : 'text-gray-400 hover:text-orange-300 hover:bg-orange-500/10'
                            }`}
                          >
                            <Music className="w-3 h-3" />
                            Catalog
                          </button>
                          <button
                            onClick={() => setWinWinRewardsTab('listener')}
                            className={`flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              winWinRewardsTab === 'listener'
                                ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-500'
                                : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                            }`}
                          >
                            <Headphones className="w-3 h-3" />
                            Listener
                          </button>
                        </div>
                      )}

                      {/* Catalog (Creator) Rewards Tab */}
                      {me && winWinRewardsTab === 'catalog' && (
                        <div className="p-3 border-b border-orange-500/20">
                          <div className="text-[10px] text-orange-400/80 uppercase tracking-wider mb-2 text-center">
                            Your Catalog Earnings (70% Creator Share)
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                              <div className="text-[9px] text-yellow-500/70 uppercase">Catalog</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                                {myStreamingRewardsLoading ? '...' : myTotalOgunEarned.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-yellow-500/70">OGUN</div>
                            </div>
                            <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                              <div className="text-[9px] text-cyan-500/70 uppercase">Streams</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                {myStreamingRewardsLoading ? '...' : myTotalStreams.toLocaleString()}
                              </div>
                              <div className="text-[9px] text-cyan-500/70">plays</div>
                            </div>
                            <div className="text-center p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                              <div className="text-[9px] text-orange-500/70 uppercase">Tracks</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                                {myStreamingRewardsLoading ? '...' : (myStreamingRewardsData?.scidsByProfile?.length || 0)}
                              </div>
                              <div className="text-[9px] text-orange-500/70">active</div>
                            </div>
                          </div>
                          <p className="text-[9px] text-gray-500 text-center mt-2">
                            Earned when others stream YOUR tracks
                          </p>
                        </div>
                      )}

                      {/* Listener Rewards Tab */}
                      {me && winWinRewardsTab === 'listener' && (
                        <div className="p-3 border-b border-cyan-500/20">
                          <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider mb-2 text-center">
                            Your Listener Earnings (30% Listener Share)
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                              <div className="text-[9px] text-cyan-500/70 uppercase">Listener</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                0.00
                              </div>
                              <div className="text-[9px] text-cyan-500/70">OGUN</div>
                            </div>
                            <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                              <div className="text-[9px] text-purple-500/70 uppercase">Streamed</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                0
                              </div>
                              <div className="text-[9px] text-purple-500/70">NFTs</div>
                            </div>
                            <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                              <div className="text-[9px] text-green-500/70 uppercase">Rate</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                                0.15
                              </div>
                              <div className="text-[9px] text-green-500/70">OGUN/NFT</div>
                            </div>
                          </div>
                          <div className="mt-2 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                            <p className="text-[9px] text-cyan-400 text-center">
                              🎧 Coming Soon! Earn 30% when YOU stream NFT tracks
                            </p>
                            <p className="text-[8px] text-gray-500 text-center mt-1">
                              Stream NFT tracks for 30+ sec → Earn 0.15 OGUN each
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Reward Rates */}
                      <div className="p-3 border-b border-orange-500/20">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
                            <div className="text-[10px] text-yellow-400/80">NFT Tracks</div>
                            <div className="text-base font-bold text-yellow-400">0.5 OGUN</div>
                            <div className="text-[9px] text-gray-500">per stream</div>
                          </div>
                          <div className="text-center p-2 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
                            <div className="text-[10px] text-cyan-400/80">Regular</div>
                            <div className="text-base font-bold text-cyan-400">0.05 OGUN</div>
                            <div className="text-[9px] text-gray-500">per stream</div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                          className="py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-lg text-sm flex items-center justify-center gap-1"
                        >
                          <Wallet className="w-3 h-3" />
                          Claim
                        </button>
                        <button
                          onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                          className="py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          Stake
                        </button>
                      </div>

                      {/* Footer */}
                      <div className="px-3 pb-2 text-center">
                        <p className="text-[9px] text-gray-500">
                          Creator 70% · Listener 30% · 30sec min · Polygon
                        </p>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Vibes - Social Links Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVibesModal(!showVibesModal)}
                    className="hover:bg-purple-500/10 px-2"
                    title="Follow Us"
                  >
                    <Users className="w-5 h-5 text-purple-400" />
                  </Button>

                  {/* Vibes Dropdown Modal */}
                  {showVibesModal && (
                    <Card className="absolute left-0 top-12 w-72 z-50 shadow-2xl border-2 border-purple-500/50 bg-gradient-to-b from-neutral-900 via-purple-950/10 to-neutral-900">
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-cyan-900/50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Vibes</h3>
                            <p className="text-[10px] text-purple-300/80">Connect with SoundChain</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowVibesModal(false)} className="w-6 h-6 p-0 hover:bg-purple-500/20">
                          <X className="w-4 h-4 text-purple-400" />
                        </Button>
                      </div>

                      {/* Social Links */}
                      <div className="p-3 space-y-2">
                        <a href="https://twitter.com/soundchain_io" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-sm">𝕏</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">Twitter / X</div>
                            <div className="text-[10px] text-blue-400">@soundchain_io</div>
                          </div>
                        </a>
                        <a href="https://discord.gg/5yZG6BTTHV" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                            <span className="text-white text-sm">🎮</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">Discord</div>
                            <div className="text-[10px] text-indigo-400">Join Community</div>
                          </div>
                        </a>
                        <a href="https://t.me/+DbHfqlVpV644ZGMx" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                            <span className="text-white text-sm">✈️</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">Telegram</div>
                            <div className="text-[10px] text-cyan-400">Join Chat</div>
                          </div>
                        </a>
                        <a href="https://instagram.com/soundchain.io" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 via-purple-500 to-orange-400 flex items-center justify-center">
                            <span className="text-white text-sm">📷</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">Instagram</div>
                            <div className="text-[10px] text-pink-400">@soundchain.io</div>
                          </div>
                        </a>
                        <a href="https://youtube.com/channel/UC-TJ1KIYWCYLtngwaELgyLQ" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <span className="text-white text-sm">▶️</span>
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">YouTube</div>
                            <div className="text-[10px] text-red-400">SoundChain</div>
                          </div>
                        </a>
                      </div>

                      {/* Footer */}
                      <div className="px-3 pb-2 text-center border-t border-purple-500/20 pt-2">
                        <p className="text-[9px] text-gray-500">SOUNDCHAIN · THE FUTURE OF MUSIC</p>
                      </div>
                    </Card>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => me ? dispatchShowCreateModal(true, 'mint') : router.push('/login')}
                  className="hover:bg-purple-500/10 px-2"
                  title="Mint NFT"
                >
                  <Music className="w-5 h-5 text-purple-400" />
                </Button>
              </div>

              {/* Desktop navigation with full labels - visible on large screens */}
              <div className="hidden lg:flex items-center space-x-2">
                {navigationPages.map((page) => (
                  <Link key={page.name} href={page.href}>
                    <Button variant="ghost" size="sm" className={`hover:bg-cyan-500/10 ${page.href === '/dex' ? 'text-cyan-400 bg-cyan-500/10' : ''}`}>
                      <page.icon className="w-4 h-4 mr-2" />
                      {page.name}
                    </Button>
                  </Link>
                ))}

                {/* Post+ Button - Create posts, embeds, stories */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateClick}
                  className="hover:bg-cyan-500/10"
                >
                  <NewPost className="w-4 h-4 mr-2" />
                  Post+
                </Button>

                {/* Mint+ Button - NFT Minting with TrackMetadataForm */}
                {isMinting ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => me ? dispatchShowCreateModal(true, 'mint') : router.push('/login')}
                    className="hover:bg-purple-500/10 nyan-cat-animation"
                  >
                    <Music className="w-4 h-4 mr-2 text-purple-400" />
                    <span className="text-purple-400">Minting...</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => me ? dispatchShowCreateModal(true, 'mint') : router.push('/login')}
                    className="hover:bg-purple-500/10"
                  >
                    <Music className="w-4 h-4 mr-2 text-purple-400" />
                    <span className="text-purple-400">Mint+</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
              <div className="relative hidden lg:block">
                <input
                  type="search"
                  placeholder="Search tracks, users..."
                  value={exploreSearchQuery}
                  onChange={(e) => {
                    setExploreSearchQuery(e.target.value)
                    if (e.target.value.length >= 2 && selectedView !== 'explore') {
                      setSelectedView('explore')
                      router.push('/dex/explore', undefined, { shallow: true })
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && exploreSearchQuery.length >= 1) {
                      setSelectedView('explore')
                      router.push('/dex/explore', undefined, { shallow: true })
                    }
                  }}
                  className="w-60 bg-black/40 border border-cyan-500/20 rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-cyan-400/60" />
              </div>

              {/* Backend Tab Button - hidden on mobile */}
              <Button variant="ghost" size="sm" onClick={() => setShowBackendPanel(true)} className="hover:bg-purple-500/20 hidden sm:flex">
                <Server className="w-5 h-5 text-purple-400" />
                <span className="hidden xl:inline ml-2 text-purple-400">Backend</span>
              </Button>

              {/* Notifications Bell - Dropdown Modal */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative hover:bg-cyan-500/10"
                  onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                >
                  <Bell className="w-5 h-5" />
                  {(user?.unreadNotificationCount ?? 0) > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {user?.unreadNotificationCount}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown - Right-aligned, proper width for mobile */}
                {showNotifications && (
                  <Card className="absolute right-0 top-12 w-80 sm:w-96 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-cyan-500/30">
                      <h3 className="retro-title text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-yellow-400" />
                        Notifications
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(70vh-60px)] custom-scrollbar">
                      <Notifications closePopOver={() => setShowNotifications(false)} />
                    </div>
                  </Card>
                )}
              </div>

{/* Retro-style Wallet Connect Button */}
              <WalletConnectButton compact />

              <div className="relative">
                <Avatar
                  className="w-8 h-8 sm:w-10 sm:h-10 analog-glow cursor-pointer bg-gradient-to-br from-purple-600 to-cyan-600 hover:ring-2 hover:ring-cyan-400"
                  onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                >
                  {user?.profilePicture && !profileImageError ? (
                    <AvatarImage
                      src={user.profilePicture}
                      onError={() => setProfileImageError(true)}
                    />
                  ) : null}
                  <AvatarFallback className="text-white font-bold">
                    {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                {/* COMPLETE User Dropdown Menu - EXACT Legacy UI */}
                {showUserMenu && (
                  <Card className="absolute right-0 top-12 w-80 retro-card z-50 shadow-2xl max-h-[80vh] overflow-y-auto">
                    <CardContent className="p-4">
                      {user ? (
                        <>
                          {/* User Info Header */}
                          <div className="flex items-center gap-3 pb-4 border-b border-cyan-500/30">
                            <Avatar className="w-14 h-14">
                              {user.profilePicture && !profileImageError ? (
                                <AvatarImage src={user.profilePicture} />
                              ) : null}
                              <AvatarFallback className="text-lg">{(user.displayName || user.userHandle)?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="retro-text text-base truncate flex items-center gap-2">
                                {user.displayName || user.userHandle || 'User'}
                                {user.teamMember && <SoundchainGoldLogo className="w-5 h-5 flex-shrink-0" />}
                                {!user.teamMember && user.verified && <VerifiedIcon className="w-5 h-5 flex-shrink-0" />}
                              </div>
                              <div className="retro-json text-xs truncate">@{user.userHandle || 'user'}</div>
                            </div>
                          </div>

                          {/* Alerts & Inbox */}
                          <div className="py-3 space-y-1 border-b border-cyan-500/30">
                            <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10 relative" onClick={() => { setShowUserMenu(false); setShowNotifications(true); }}>
                              <Bell className="w-4 h-4 mr-3" />
                              <span className="flex-1 text-left">Alerts</span>
                              {user.unreadNotificationCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">{user.unreadNotificationCount}</Badge>
                              )}
                            </Button>
                            <Link href="/messages">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10 relative" onClick={() => setShowUserMenu(false)}>
                                <MessageCircle className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Inbox</span>
                                {user.unreadMessageCount > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">{user.unreadMessageCount}</Badge>
                                )}
                              </Button>
                            </Link>
                          </div>

                          {/* Main Menu Items */}
                          <div className="py-3 space-y-1 border-b border-cyan-500/30">
                            <Link href="/dex/wallet">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('wallet')}}>
                                <WalletIcon className="w-4 h-4 mr-3" />
                                Wallet
                              </Button>
                            </Link>
                            <Link href="https://soundchain-1.gitbook.io/soundchain-docs/" target="_blank" rel="noreferrer">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
                                <Document className="w-4 h-4 mr-3" />
                                Docs
                                <ExternalLink className="w-3 h-3 ml-auto" />
                              </Button>
                            </Link>
                            <Link href="/dex/feedback">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('feedback')}}>
                                <Feedback className="w-4 h-4 mr-3" />
                                Leave Feedback
                              </Button>
                            </Link>
                            {userData?.me?.roles?.includes(Role.Admin) && (
                              <Link href="/dex/admin">
                                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('admin')}}>
                                  <VerifiedIcon className="w-4 h-4 mr-3" />
                                  Admin Panel
                                </Button>
                              </Link>
                            )}
                            <Link href="/dex/settings">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('settings')}}>
                                <SettingsIcon className="w-4 h-4 mr-3" />
                                Account Settings
                              </Button>
                            </Link>
                          </div>

                          {/* Logout */}
                          <div className="pt-3">
                            <Button variant="ghost" className="w-full justify-start text-sm text-red-400 hover:bg-red-500/10" onClick={() => { onLogout(); setShowUserMenu(false); }}>
                              <Logout className="w-4 h-4 mr-3" />
                              Logout
                            </Button>
                          </div>

                          {/* Privacy Policy Footer */}
                          <div className="mt-4 pt-3 border-t border-cyan-500/30 flex items-center justify-between text-xs text-gray-400">
                            <Link href="/privacy-policy" className="hover:text-cyan-400">
                              PRIVACY POLICY
                            </Link>
                            <span>v {config.appVersion}</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3 py-2">
                          <p className="text-sm text-gray-400 text-center">Sign in to access your account</p>
                          <Link href="/login">
                            <Button className="w-full retro-button" onClick={() => setShowUserMenu(false)}>
                              Login / Sign Up
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Profile Header - Only shown when logged in on feed view */}
        {user && selectedView === 'feed' && (
        <div className="relative z-10 pt-8 pb-6">
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {/* User Profile */}
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="relative">
                  <div className="w-40 lg:w-48 h-40 lg:h-48 rounded-3xl overflow-hidden analog-glow bg-gradient-to-br from-purple-900 to-cyan-900">
                    {user?.profilePicture && !profileImageError ? (
                      <img
                        src={user.profilePicture}
                        alt={user.displayName || 'Profile'}
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.error('❌ Profile image failed to load:', user.profilePicture)
                          setProfileImageError(true)
                        }}
                        onLoad={() => console.log('✅ Profile image loaded successfully')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-white font-bold">
                        {(user?.displayName || user?.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full border-4 border-black/50 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    {/* Username with inline badges - EXACT legacy UI */}
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: "'Space Mono', 'JetBrains Mono', monospace" }}>
                        {userLoading ? 'Loading...' : (user?.displayName || user?.userHandle || 'User')}
                      </h1>
                      {/* Team Member Badge (Gold SoundChain Logo) */}
                      {user?.teamMember && (
                        <SoundchainGoldLogo className="flex-shrink-0" style={{ width: '34px', height: '34px' }} aria-label="SoundChain Team Member" />
                      )}
                      {/* Verified Badge */}
                      {!user?.teamMember && user?.verified && (
                        <VerifiedIcon className="flex-shrink-0" style={{ width: '34px', height: '34px' }} aria-label="Verified user" />
                      )}
                      {/* POAP Badges - MATCH 34x34 */}
                      {user?.badges?.map((badge, index) => (
                        <div key={index} className="flex-shrink-0" style={{ width: '34px', height: '34px' }}>
                          <Image alt="badge" src={`/badges/badge-01.svg`} width={34} height={34} style={{ width: '34px', height: '34px' }} />
                        </div>
                      ))}
                    </div>
                    <p className="retro-json text-sm">@{user?.userHandle || 'user'}</p>
                    <p className="text-gray-300 text-sm max-w-md">{user?.bio || 'Welcome to SoundChain DEX Dashboard'}</p>
                    {!userLoading && !user && (
                      <p className="text-red-400 text-xs mt-2">⚠️ User data failed to load. Check console for errors.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="metadata-section p-4 text-center">
                      <div className="retro-text text-xl">{userTracks.length}</div>
                      <div className="metadata-label text-xs">Tracks</div>
                    </div>
                    <div className="metadata-section p-4 text-center">
                      <div className="retro-text text-xl">{user?.followerCount?.toLocaleString() || 0}</div>
                      <div className="metadata-label text-xs">Followers</div>
                    </div>
                    <div className="metadata-section p-4 text-center">
                      <div className="retro-text text-xl">{user?.followingCount?.toLocaleString() || 0}</div>
                      <div className="metadata-label text-xs">Following</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button className="retro-button"><Users className="w-4 h-4 mr-2" />Follow</Button>
                    <Button variant="outline" className="border-purple-500/50"><MessageCircle className="w-4 h-4 mr-2" />Message</Button>
                    <Button variant="outline" className="border-cyan-500/50"><Share2 className="w-4 h-4" /></Button>
                  </div>

                  {userWallet && (
                    <Card className="retro-card p-3 w-fit">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-orange-400" />
                        <span className="retro-json text-sm">{userWallet.slice(0, 6)}...{userWallet.slice(-4)}</span>
                        <Button variant="ghost" size="sm" onClick={copyAddress} className="p-1"><Copy className="w-3 h-3" /></Button>
                      </div>
                    </Card>
                  )}

                  {/* Badges are now displayed inline next to username above */}
                </div>
              </div>

              {/* Portfolio Panel - Moved to protected wallet page for privacy */}
            </div>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-8">
          {/* View Tabs - LEGACY UI PATTERN WITH GRADIENT TEXT */}
          {/* Order: Feed, Dashboard, Users first, then rest */}
          <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/feed', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-green-500/10 ${selectedView === 'feed' ? 'bg-green-500/10' : ''}`}
            >
              <MessageCircle className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'feed' ? 'text-green-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'feed' ? 'green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Feed
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/announcements', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-cyan-500/10 ${selectedView === 'announcements' ? 'bg-cyan-500/10' : ''}`}
            >
              <Rocket className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'announcements' ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'announcements' ? 'cyan-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Announcements
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/dashboard', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-yellow-500/10 ${selectedView === 'dashboard' ? 'bg-yellow-500/10' : ''}`}
            >
              <Home className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'dashboard' ? 'text-yellow-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'dashboard' ? 'yellow-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Dashboard
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/staking', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-yellow-500/10 ${selectedView === 'staking' ? 'bg-yellow-500/10' : ''}`}
            >
              <Coins className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'staking' ? 'text-yellow-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'staking' ? 'yellow-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Stake
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/users', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-indigo-500/10 ${selectedView === 'users' || selectedView === 'profile' ? 'bg-indigo-500/10' : ''}`}
            >
              <Users className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'users' || selectedView === 'profile' ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'users' || selectedView === 'profile' ? 'indigo-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Users
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/marketplace', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-purple-500/10 ${selectedView === 'marketplace' ? 'bg-purple-500/10' : ''}`}
            >
              <ShoppingBag className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'marketplace' ? 'text-purple-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'marketplace' ? 'purple-green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Marketplace
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/explore', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-orange-500/10 ${selectedView === 'explore' ? 'bg-orange-500/10' : ''}`}
            >
              <Compass className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'explore' ? 'text-orange-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'explore' ? 'orange-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Explore
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/library', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-blue-500/10 ${selectedView === 'library' ? 'bg-blue-500/10' : ''}`}
            >
              <Library className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'library' ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'library' ? 'blue-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Library
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dex/playlist', undefined, { shallow: false })}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-pink-500/10 ${selectedView === 'playlist' ? 'bg-pink-500/10' : ''}`}
            >
              <ListMusic className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'playlist' ? 'text-pink-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'playlist' ? 'pink-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Playlist
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowTop100Modal(true)}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-yellow-500/10 ${showTop100Modal ? 'bg-yellow-500/10' : ''}`}
            >
              <Trophy className={`w-4 h-4 mr-2 transition-colors duration-300 ${showTop100Modal ? 'text-yellow-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${showTop100Modal ? 'yellow-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Top 100
              </span>
            </Button>
          </div>

          {/* Dashboard View - Genres & Leaderboards Only */}
          {selectedView === 'dashboard' && (
          <>
            <div className="space-y-6">
              {/* Browse / Leaderboard Toggle */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTracksViewMode('browse')}
                    className={`transition-all duration-300 ${tracksViewMode === 'browse' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTracksViewMode('leaderboard')}
                    className={`transition-all duration-300 ${tracksViewMode === 'leaderboard' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboards
                  </Button>
                </div>
                <div className="flex gap-2">
                  {genreTracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400">Loading genres...</Badge>}
                  {genreTracksError && (
                    <Badge className="bg-red-500/20 text-red-400">Error loading genres</Badge>
                  )}
                  {genreTracksData?.tracksByGenre && (
                    <Badge className="bg-green-500/20 text-green-400">
                      {genreTracksData.tracksByGenre.length} genres
                    </Badge>
                  )}
                </div>
              </div>

              {/* Browse Mode - Genre sections with horizontal scrolling */}
              {tracksViewMode === 'browse' && (
                <>
                  {/* Top Charts Section - Most streamed tracks with gamification */}
                  <TopChartsSection
                    tracks={topTracksData?.tracks?.nodes || []}
                    onPlayTrack={handlePlayTrack}
                    isPlaying={isPlaying}
                    currentTrackId={currentSong?.trackId}
                    loading={topTracksLoading}
                  />

                  {/* Genre Sections - Spotify-style horizontal scrolling */}
                  {genreTracksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-cyan-400">
                        <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
                        <span>Loading genres...</span>
                      </div>
                    </div>
                  ) : genreTracksData?.tracksByGenre?.length > 0 ? (
                    <div className="space-y-2">
                      {genreTracksData.tracksByGenre.map((genreData: any) => (
                        <GenreSection
                          key={genreData.genre}
                          genre={genreData.genre}
                          tracks={genreData.tracks}
                          onPlayTrack={handlePlayTrack}
                          isPlaying={isPlaying}
                          currentTrackId={currentSong?.trackId}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="retro-card p-8 text-center">
                      <Music className="w-12 h-12 mx-auto mb-4 text-cyan-400 opacity-50" />
                      <p className="text-gray-400">No tracks found. Upload your first track to get started!</p>
                      <Link href="/upload">
                        <Button className="retro-button mt-4">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Track
                        </Button>
                      </Link>
                    </Card>
                  )}
                </>
              )}

              {/* Leaderboard Mode - Genre standings with POAP badges */}
              {tracksViewMode === 'leaderboard' && (
                <>
                  {genreTracksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-purple-400">
                        <div className="animate-spin h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full" />
                        <span>Loading leaderboards...</span>
                      </div>
                    </div>
                  ) : genreTracksData?.tracksByGenre?.length > 0 ? (
                    <GenreLeaderboard
                      genreData={genreTracksData.tracksByGenre}
                      onPlayTrack={handlePlayTrack}
                      isPlaying={isPlaying}
                      currentTrackId={currentSong?.trackId}
                    />
                  ) : (
                    <Card className="retro-card p-8 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-purple-400 opacity-50" />
                      <p className="text-gray-400">No tracks to rank yet. Upload tracks to compete!</p>
                      <Link href="/upload">
                        <Button className="retro-button mt-4">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Track
                        </Button>
                      </Link>
                    </Card>
                  )}
                </>
              )}

              {/* Marketplace section below genres */}
              {marketTracks.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <h2 className="retro-title">Marketplace Listings ({listingData?.listingItems?.pageInfo?.totalCount || marketTracks.length})</h2>
                  <p className="text-sm text-gray-400 mb-4">NFTs available for purchase</p>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2' : 'space-y-2'}>
                    {marketTracks.map((track: any, index: number) => (
                      <TrackNFTCard
                        key={track.id}
                        track={track}
                        onPlay={() => handlePlayTrack(track, index, marketTracks)}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                        listView={viewMode === 'list'}
                      />
                    ))}
                  </div>
                  {/* Infinite scroll sentinel + Load More Marketplace Button */}
                  <div ref={listingsScrollRef} className="h-4" />
                  {(listingData?.listingItems?.pageInfo?.hasNextPage || loadingMoreListings) && (
                    <div className="flex justify-center mt-6">
                      {loadingMoreListings ? (
                        <div className="flex items-center gap-2 text-cyan-400">
                          <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                          <span>Loading more listings...</span>
                        </div>
                      ) : (
                        <Button
                          onClick={handleLoadMoreListings}
                          disabled={loadingMoreListings}
                          className="retro-button px-8"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Load More ({(listingData?.listingItems?.pageInfo?.totalCount || 0) - marketTracks.length} remaining)
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
          )}

          {/* Marketplace View */}
          {selectedView === 'marketplace' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="retro-title text-2xl">Marketplace</h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`transition-all duration-300 hover:bg-cyan-500/10 ${viewMode === 'grid' ? 'bg-cyan-500/10' : ''}`}
                  >
                    <Grid className={`w-4 h-4 transition-colors duration-300 ${viewMode === 'grid' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`transition-all duration-300 hover:bg-cyan-500/10 ${viewMode === 'list' ? 'bg-cyan-500/10' : ''}`}
                  >
                    <List className={`w-4 h-4 transition-colors duration-300 ${viewMode === 'list' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  </Button>
                </div>
              </div>

              <Card className="retro-card p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search marketplace..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black/50 border border-cyan-500/30 rounded-lg pl-10 pr-4 py-2 text-sm" />
                  </div>
                  {/* Scrollable tabs container on mobile - Marketplace only shows items for sale (no streaming tracks) */}
                  <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-1 px-1 flex-shrink-0">
                    {(['nft', 'token', 'bundle'] as const).map((type) => {
                      const isActive = selectedPurchaseType === type
                      const config = {
                        nft: { icon: ImageIcon, gradient: 'purple-gradient-text', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10', hoverBg: 'hover:bg-purple-500/10', label: 'NFTs' },
                        token: { icon: Coins, gradient: 'green-gradient-text', iconColor: 'text-green-400', bgColor: 'bg-green-500/10', hoverBg: 'hover:bg-green-500/10', label: 'Tokens' },
                        bundle: { icon: Package, gradient: 'green-yellow-gradient-text', iconColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10', hoverBg: 'hover:bg-cyan-500/10', label: 'Bundles' },
                      }[type]
                      const IconComponent = config.icon
                      return (
                        <Button
                          key={type}
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPurchaseType(type)}
                          className={`flex-shrink-0 transition-all duration-300 ${config.hoverBg} ${isActive ? config.bgColor : ''}`}
                        >
                          <IconComponent className={`w-4 h-4 mr-2 transition-colors duration-300 ${isActive ? config.iconColor : 'text-gray-400'}`} />
                          <span className={`text-xs font-black transition-all duration-300 ${isActive ? `${config.gradient} text-transparent bg-clip-text` : 'text-gray-400'}`}>
                            {config.label}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </Card>

              {selectedPurchaseType === 'nft' && (
                <>
                  {/* Real NFT listings from marketplace - show ALL listings with listingItem */}
                  {listingLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
                      <span className="ml-3 text-gray-400">Loading marketplace...</span>
                    </div>
                  ) : filteredMarketTracks.filter((t: any) => t.listingItem).length > 0 ? (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2' : 'space-y-2'}>
                      {filteredMarketTracks
                        .filter((t: any) => t.listingItem)
                        .map((track: any, index: number) => (
                          <TrackNFTCard
                            key={track.id}
                            track={track}
                            onPlay={() => handlePlayTrack(track, index, filteredMarketTracks.filter((t: any) => t.listingItem))}
                            isPlaying={isPlaying}
                            isCurrentTrack={currentSong?.trackId === track.id}
                            listView={viewMode === 'list'}
                          />
                        ))}
                    </div>
                  ) : (
                    <Card className="retro-card p-8 text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 text-purple-400 opacity-50" />
                      <h3 className="retro-title mb-2">No NFTs Listed</h3>
                      <p className="text-gray-400 text-sm mb-4">NFTs available for purchase will appear here.</p>
                      {listingError && (
                        <p className="text-xs text-red-400 mt-2">Error: {listingError.message}</p>
                      )}
                      <p className="text-xs text-gray-600">
                        Total in query: {marketTracks.length} | With listingItem: {marketTracks.filter((t: any) => t.listingItem).length}
                      </p>
                    </Card>
                  )}
                </>
              )}

              {selectedPurchaseType === 'token' && (
                <Card className="retro-card p-8 text-center">
                  <Coins className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
                  <h3 className="retro-title mb-2">Token Marketplace Coming Soon</h3>
                  <p className="text-gray-400 text-sm">OGUN and music token trading will be available here.</p>
                </Card>
              )}

              {selectedPurchaseType === 'bundle' && (
                <Card className="retro-card p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-cyan-400 opacity-50" />
                  <h3 className="retro-title mb-2">Bundle Marketplace Coming Soon</h3>
                  <p className="text-gray-400 text-sm">NFT + Token bundles will be tradeable here.</p>
                </Card>
              )}

            </div>
          )}

          {/* Users View - Browse and Leaderboard for all profiles */}
          {selectedView === 'users' && (
            <div className="space-y-6">
              {/* Users view mode toggle */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUsersViewMode('browse')}
                    className={`transition-all duration-300 ${usersViewMode === 'browse' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    Browse
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUsersViewMode('leaderboard')}
                    className={`transition-all duration-300 ${usersViewMode === 'leaderboard' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboard
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {exploreUsersLoading && <Badge className="bg-yellow-500/20 text-yellow-400">Loading users...</Badge>}
                  {exploreUsersError && (
                    <Badge className="bg-red-500/20 text-red-400">
                      Error: {exploreUsersError.message}
                    </Badge>
                  )}
                  {exploreUsersData?.exploreUsers?.nodes && (
                    <Badge className="bg-green-500/20 text-green-400">
                      {exploreUsersData.exploreUsers.pageInfo?.totalCount
                        ? `${exploreUsersData.exploreUsers.nodes.length} of ${exploreUsersData.exploreUsers.pageInfo.totalCount} users`
                        : `${exploreUsersData.exploreUsers.nodes.length} users${exploreUsersData.exploreUsers.pageInfo?.hasNextPage ? '+' : ''}`
                      }
                    </Badge>
                  )}
                  {!exploreUsersLoading && !exploreUsersData?.exploreUsers?.nodes && !exploreUsersError && (
                    <Badge className="bg-orange-500/20 text-orange-400">
                      No data yet
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchUsers()}
                    className="text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refetch
                  </Button>
                </div>
              </div>

              {/* Browse Mode - Micro card grid of users (stacked, compact) */}
              {usersViewMode === 'browse' && (
                <>
                  {exploreUsersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-indigo-400">
                        <div className="animate-spin h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
                        <span>Loading users...</span>
                      </div>
                    </div>
                  ) : (exploreUsersData?.exploreUsers?.nodes?.length ?? 0) > 0 ? (
                    <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                      {/* Deduplicate users by ID and filter out profiles without userHandle */}
                      {exploreUsersData?.exploreUsers?.nodes
                        ?.filter((profile: any, index: number, self: any[]) =>
                          profile.userHandle && self.findIndex((p: any) => p.id === profile.id) === index
                        )
                        ?.map((profile: any) => {
                        // Check if profile picture is a video/gif
                        const isVideo = profile.profilePicture && /\.(mp4|mov|webm)$/i.test(profile.profilePicture)
                        const isGif = profile.profilePicture && /\.gif$/i.test(profile.profilePicture)

                        return (
                          <Link key={profile.id} href={`/dex/users/${profile.userHandle}`} onClick={saveUsersScrollPosition}>
                            <div className="relative group cursor-pointer">
                              {/* Micro card with avatar as main visual */}
                              <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 ring-1 ring-neutral-700 group-hover:ring-indigo-500/60 transition-all duration-300">
                                {profile.profilePicture ? (
                                  isVideo ? (
                                    <video
                                      src={profile.profilePicture}
                                      className="w-full h-full object-cover"
                                      autoPlay
                                      muted
                                      loop
                                      playsInline
                                    />
                                  ) : (
                                    <img
                                      src={profile.profilePicture}
                                      alt={profile.displayName || profile.userHandle}
                                      className={`w-full h-full object-cover ${isGif ? '' : ''}`}
                                      loading="lazy"
                                    />
                                  )
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-2xl font-bold">
                                    {(profile.displayName || profile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                {/* Hover overlay with info */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                                  <span className="text-white text-xs font-semibold truncate w-full text-center">{profile.displayName || profile.userHandle}</span>
                                  <span className="text-indigo-300 text-[10px]">{profile.followerCount || 0} followers</span>
                                </div>
                                {/* Verified badge */}
                                {profile.verified && (
                                  <div className="absolute top-1 right-1">
                                    <BadgeCheck className="w-4 h-4 text-cyan-400 drop-shadow-lg" />
                                  </div>
                                )}
                              </div>
                              {/* Name below card */}
                              <p className="text-[10px] text-gray-400 truncate text-center mt-1 group-hover:text-indigo-300 transition-colors">@{profile.userHandle}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                    {/* Load More Users Button */}
                    {exploreUsersData?.exploreUsers?.pageInfo?.hasNextPage && (
                      <div className="flex justify-center pt-6">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={handleLoadMoreUsers}
                          disabled={loadingMoreUsers}
                          className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 px-8"
                        >
                          {loadingMoreUsers ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full mr-2" />
                              Loading more users...
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 mr-2" />
                              Load More Users
                              {exploreUsersData?.exploreUsers?.pageInfo?.totalCount && (
                                <span className="ml-1 text-gray-400">
                                  ({(exploreUsersData.exploreUsers.pageInfo.totalCount || 0) - (exploreUsersData?.exploreUsers?.nodes?.length || 0)} remaining)
                                </span>
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {/* All users loaded indicator */}
                    {!exploreUsersData?.exploreUsers?.pageInfo?.hasNextPage && exploreUsersData?.exploreUsers?.nodes?.length && exploreUsersData.exploreUsers.nodes.length > 100 && (
                      <div className="text-center pt-4 text-gray-500 text-sm">
                        All {exploreUsersData.exploreUsers.nodes.length} users loaded
                      </div>
                    )}
                    </>
                  ) : (
                    <Card className="retro-card p-8 text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 text-indigo-400 opacity-50" />
                      <p className="text-gray-400">No users found. Be the first to join SoundChain!</p>
                    </Card>
                  )}
                </>
              )}

              {/* Leaderboard Mode - Top users by followers */}
              {usersViewMode === 'leaderboard' && (
                <>
                  {exploreUsersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-purple-400">
                        <div className="animate-spin h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full" />
                        <span>Loading leaderboard...</span>
                      </div>
                    </div>
                  ) : (exploreUsersData?.exploreUsers?.nodes?.length ?? 0) > 0 ? (
                    <Card className="retro-card overflow-hidden">
                      <div className="p-4 border-b border-cyan-500/30">
                        <h3 className="retro-title flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                          Top Users by Followers
                        </h3>
                      </div>
                      <div className="divide-y divide-cyan-500/20">
                        {/* Deduplicate users by ID and filter out profiles without userHandle */}
                        {[...(exploreUsersData?.exploreUsers?.nodes || [])]
                          .filter((profile: any, index: number, self: any[]) =>
                            profile.userHandle && self.findIndex((p: any) => p.id === profile.id) === index
                          )
                          .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
                          .slice(0, 20)
                          .map((profile: any, index: number) => (
                            <Link key={profile.id} href={`/dex/users/${profile.userHandle}`} onClick={saveUsersScrollPosition}>
                              <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-slate-400 text-black' :
                                  index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                                  'bg-gray-700 text-gray-300'
                                }`}>
                                  {index + 1}
                                </div>
                                <Avatar className="w-12 h-12">
                                  {profile.profilePicture ? (
                                    <AvatarImage src={profile.profilePicture} />
                                  ) : null}
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                                    {(profile.displayName || profile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-white truncate">{profile.displayName || profile.userHandle}</span>
                                    {profile.verified && <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">@{profile.userHandle}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-indigo-400">{(profile.followerCount || 0).toLocaleString()}</div>
                                  <div className="text-xs text-gray-500">followers</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                      </div>
                    </Card>
                  ) : (
                    <Card className="retro-card p-8 text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-purple-400 opacity-50" />
                      <p className="text-gray-400">No users to rank yet. Be the first!</p>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Feed View - 3-column desktop layout */}
          {selectedView === 'feed' && (
            <div className="flex justify-center gap-6 px-4">
              {/* Left Sidebar - Desktop only */}
              <LeftSidebar />

              {/* Main Feed - Posts only (announcements moved to dedicated tab) */}
              <div className="flex-1 max-w-[614px]" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                <Posts />
              </div>

              {/* Right Sidebar - Desktop only */}
              <RightSidebar />
            </div>
          )}

          {/* Single Post View - /dex/post/[id] for shared links */}
          {selectedView === 'post' && routeId && (
            <div className="flex justify-center gap-6 px-0 md:px-4">
              {/* Left Sidebar - Desktop only */}
              <LeftSidebar />

              {/* Single Post Content */}
              <div className="flex-1 max-w-full md:max-w-[614px]">
                {postDetailLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-cyan-400">Loading post...</span>
                  </div>
                )}
                {postDetailError && (
                  <Card className="m-4 p-6 text-center bg-neutral-900 border-neutral-800">
                    <p className="text-red-400 mb-2">Error loading post</p>
                    <p className="text-gray-500 text-sm mb-4">{postDetailError.message}</p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dex/feed')}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      Go to Feed
                    </Button>
                  </Card>
                )}
                {postDetailData?.post && (
                  <div className="pb-32">
                    {/* The Post component */}
                    <Post post={postDetailData.post} handleOnPlayClicked={(trackId: string) => {
                      if (postDetailData.post?.track) {
                        playlistState([{
                          src: postDetailData.post.track.playbackUrl,
                          trackId: postDetailData.post.track.id,
                          art: postDetailData.post.track.artworkUrl,
                          title: postDetailData.post.track.title,
                          artist: postDetailData.post.track.artist,
                          isFavorite: postDetailData.post.track.isFavorite,
                        }] as Song[], 0)
                      }
                    }} />

                    {/* Comments Section */}
                    <div className="mt-4 px-0 md:px-0">
                      <Comments postId={routeId} />
                    </div>

                    {/* View Full Feed CTA */}
                    <div className="mt-6 px-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dex/feed')}
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        View Full Feed
                      </Button>
                    </div>
                  </div>
                )}
                {!postDetailLoading && !postDetailError && !postDetailData?.post && (
                  <Card className="m-4 p-6 text-center bg-neutral-900 border-neutral-800">
                    <p className="text-neutral-400 mb-4">Post not found</p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dex/feed')}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      Go to Feed
                    </Button>
                  </Card>
                )}
              </div>

              {/* Right Sidebar - Desktop only */}
              <RightSidebar />
            </div>
          )}

          {/* Announcements View - Mobile only (desktop sees announcements in sidebars) */}
          {selectedView === 'announcements' && (
            <div className="space-y-4 px-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Rocket className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Announcements</h2>
              </div>

              {announcementsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="ml-3 text-gray-400">Loading announcements...</span>
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement: any) => (
                    <Card key={announcement.id} className="retro-card overflow-hidden border border-cyan-500/30">
                      {/* Hero Image */}
                      {announcement.imageUrl && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={announcement.imageUrl}
                            alt={announcement.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <span className="inline-block px-2 py-1 bg-cyan-500 text-black text-xs font-bold rounded mb-2">
                              {announcement.type?.replace('_', ' ') || 'UPDATE'}
                            </span>
                            <h3 className="text-white font-bold text-lg drop-shadow-lg">{announcement.title}</h3>
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <CardContent className="p-4">
                        {!announcement.imageUrl && (
                          <>
                            <span className="inline-block px-2 py-1 bg-cyan-500 text-black text-xs font-bold rounded mb-2">
                              {announcement.type?.replace('_', ' ') || 'UPDATE'}
                            </span>
                            <h3 className="text-white font-bold text-lg mb-2">{announcement.title}</h3>
                          </>
                        )}

                        {/* Author & Date */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                            <Rocket className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-cyan-400 text-sm font-medium">{announcement.companyName || 'SoundChain'}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-500 text-sm">
                            {new Date(announcement.publishedAt || announcement.createdAt || '').toLocaleDateString()}
                          </span>
                        </div>

                        {/* Full Content */}
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                          {announcement.content}
                        </p>

                        {/* Tags */}
                        {announcement.tags && announcement.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {announcement.tags.map((tag: string) => (
                              <span key={tag} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {announcement.link && (
                          <a
                            href={announcement.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                          >
                            Visit Link <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="retro-card p-8 text-center">
                  <Rocket className="w-12 h-12 mx-auto mb-4 text-cyan-400 opacity-50" />
                  <h3 className="text-white font-bold mb-2">No Announcements</h3>
                  <p className="text-gray-400 text-sm">Check back later for updates from SoundChain!</p>
                </Card>
              )}
            </div>
          )}

          {/* Explore View - Deep Search for Tracks AND Users */}
          {selectedView === 'explore' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <Card className="retro-card p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tracks, artists, users..."
                      value={exploreSearchQuery}
                      onChange={(e) => setExploreSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 retro-text"
                    />
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex space-x-2 mt-4">
                  <Button
                    onClick={() => setExploreTab('users')}
                    className={`px-4 py-2 rounded-lg transition-all ${exploreTab === 'users' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Users ({exploreUsersData?.exploreUsers?.nodes?.length || 0})
                  </Button>
                  <Button
                    onClick={() => setExploreTab('tracks')}
                    className={`px-4 py-2 rounded-lg transition-all ${exploreTab === 'tracks' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Tracks ({exploreTracksData?.exploreTracks?.nodes?.length || 0})
                  </Button>
                </div>
              </Card>

              {/* Users Results */}
              {exploreTab === 'users' && (
                <div className="space-y-4">
                  {exploreUsersLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-gray-400">Searching users...</p>
                    </div>
                  )}
                  {!exploreUsersLoading && exploreUsersData?.exploreUsers?.nodes?.length === 0 && (
                    <Card className="retro-card p-8 text-center">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <h3 className="text-white font-bold mb-2">No users found</h3>
                      <p className="text-gray-400 text-sm">Try a different search term</p>
                    </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Deduplicate users by ID to prevent duplicate avatars */}
                    {exploreUsersData?.exploreUsers?.nodes
                      ?.filter((user: any, index: number, self: any[]) =>
                        self.findIndex((u: any) => u.id === user.id) === index
                      )
                      ?.map((user: any) => (
                      <Card key={user.id} className="retro-card p-4 hover:border-cyan-500/50 transition-all">
                        <div className="flex items-start gap-4">
                          {/* Avatar with Online Status */}
                          <div className="relative flex-shrink-0">
                            {user.userHandle ? (
                              <Link href={`/dex/users/${user.userHandle}`}>
                                <Avatar className="w-16 h-16 border-2 border-cyan-500/30">
                                  <AvatarImage src={user.profilePicture || '/default-avatar.png'} alt={user.displayName} className="object-cover" />
                                  <AvatarFallback className="bg-gray-700 text-white">{user.displayName?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                              </Link>
                            ) : (
                              <Avatar className="w-16 h-16 border-2 border-cyan-500/30">
                                <AvatarImage src={user.profilePicture || '/default-avatar.png'} alt={user.displayName} className="object-cover" />
                                <AvatarFallback className="bg-gray-700 text-white">{user.displayName?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                            )}
                            {/* Online Status Indicator (Green Dot) */}
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full" title="Online"></div>
                          </div>
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            {user.userHandle ? (
                              <Link href={`/dex/users/${user.userHandle}`}>
                                <h3 className="text-white font-bold truncate hover:text-cyan-400 transition-colors flex items-center gap-1">
                                  {user.displayName || 'Unknown User'}
                                  {user.isVerified && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
                                </h3>
                              </Link>
                            ) : (
                              <h3 className="text-white font-bold truncate flex items-center gap-1">
                                {user.displayName || 'Unknown User'}
                                {user.isVerified && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
                              </h3>
                            )}
                            <p className="text-gray-400 text-sm truncate">@{user.userHandle || user.id?.slice(0, 8)}</p>
                            <p className="text-gray-500 text-xs mt-1">{user.followerCount || 0} followers</p>
                          </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          {me?.profile?.id !== user.id && (
                            <>
                              <Button
                                onClick={() => handleFollowToggle(user.id, user.isFollowed, user.userHandle || '')}
                                disabled={followLoading || unfollowLoading}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${user.isFollowed ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-cyan-500 text-black hover:bg-cyan-600'}`}
                              >
                                {user.isFollowed ? 'Following' : 'Follow'}
                              </Button>
                              <Link href={me ? '/messages' : '/login'} className="flex-1">
                                <Button className="w-full py-2 rounded-lg text-sm bg-gray-700 text-white hover:bg-gray-600">
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  Message
                                </Button>
                              </Link>
                            </>
                          )}
                          {me?.profile?.id === user.id && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 px-3 py-1">You</Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks Results */}
              {exploreTab === 'tracks' && (
                <div className="space-y-4">
                  {exploreTracksLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-gray-400">Searching tracks...</p>
                    </div>
                  )}
                  {!exploreTracksLoading && exploreTracksData?.exploreTracks?.nodes?.length === 0 && (
                    <Card className="retro-card p-8 text-center">
                      <Music className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <h3 className="text-white font-bold mb-2">No tracks found</h3>
                      <p className="text-gray-400 text-sm">Try a different search term</p>
                    </Card>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {exploreTracksData?.exploreTracks?.nodes?.map((track: any, index: number) => {
                      const isCurrentTrack = currentSong.trackId === track.id
                      const isTrackPlaying = isPlaying && isCurrentTrack
                      const exploreTracks = exploreTracksData?.exploreTracks?.nodes || []
                      return (
                        <Card key={track.id} className="retro-card overflow-hidden hover:border-cyan-500/50 transition-all group">
                          <div className="relative aspect-square">
                            <img
                              src={track.artworkUrl || track.nft?.imageUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop'}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              onClick={() => {
                                if (isCurrentTrack) {
                                  togglePlay()
                                } else {
                                  // Set up full playlist for continuous autoplay
                                  const playlist: Song[] = exploreTracks.map((t: any) => ({
                                    trackId: t.id,
                                    src: t.audioUrl || t.playbackUrl || '',
                                    title: t.title || 'Untitled',
                                    artist: t.nft?.creator?.profile?.displayName || 'Unknown',
                                    art: t.artworkUrl || t.nft?.imageUrl || '',
                                    isFavorite: t.isFavorite,
                                  }))
                                  playlistState(playlist, index)
                                }
                              }}
                              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {isTrackPlaying ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white" />}
                            </Button>
                          </div>
                          <div className="p-3">
                            <h3 className="text-white text-sm font-bold truncate">{track.title || 'Untitled'}</h3>
                            <p className="text-gray-400 text-xs truncate">{track.nft?.creator?.profile?.displayName || 'Unknown Artist'}</p>
                            <p className="text-cyan-400 text-xs mt-1">{track.playbackCountFormatted || '0'} plays</p>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick Discovery Section */}
              <Card className="retro-card p-4">
                <h3 className="retro-title text-lg mb-4">Quick Discovery</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="metadata-section p-4 hover:border-orange-500/50 transition-all cursor-pointer">
                    <Flame className="w-8 h-8 text-orange-400 mb-2" />
                    <h3 className="font-bold text-white">Trending</h3>
                    <p className="text-xs text-gray-400">Hot tracks this week</p>
                  </Card>
                  <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                    <Rocket className="w-8 h-8 text-cyan-400 mb-2" />
                    <h3 className="font-bold text-white">New Releases</h3>
                    <p className="text-xs text-gray-400">Fresh drops from artists</p>
                  </Card>
                  <Card className="metadata-section p-4 hover:border-purple-500/50 transition-all cursor-pointer">
                    <Trophy className="w-8 h-8 text-purple-400 mb-2" />
                    <h3 className="font-bold text-white">Top Charts</h3>
                    <p className="text-xs text-gray-400">Most played tracks</p>
                  </Card>
                </div>
              </Card>
            </div>
          )}

          {/* Library View - Real Liked Tracks */}
          {selectedView === 'library' && (
            <div className="space-y-6">
              {/* Library Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="metadata-section p-4 text-center cursor-pointer hover:bg-white/5 transition-colors">
                  <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{favoriteTracksData?.favoriteTracks?.nodes?.length || 0}</p>
                  <p className="text-xs text-gray-400">Liked Tracks</p>
                </Card>
                <Card className="metadata-section p-4 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedView('wallet')}>
                  <ImageIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{ownedTracksData?.groupedTracks?.nodes?.length || 0}</p>
                  <p className="text-xs text-gray-400">Owned NFTs</p>
                </Card>
                <Card className="metadata-section p-4 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedView('playlist')}>
                  <ListMusic className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{playlistsData?.getUserPlaylists?.nodes?.length || 0}</p>
                  <p className="text-xs text-gray-400">Playlists</p>
                </Card>
                <Card className="metadata-section p-4 text-center">
                  <Play className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">--</p>
                  <p className="text-xs text-gray-400">Play History</p>
                </Card>
              </div>

              {/* Liked Tracks Section */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-red-400" />
                    <h2 className="retro-title text-xl">Liked Tracks</h2>
                    {favoriteTracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Loading...</Badge>}
                  </div>
                </div>

                {favoriteTracksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading liked tracks...</span>
                  </div>
                ) : (favoriteTracksData?.favoriteTracks?.nodes?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {favoriteTracksData?.favoriteTracks?.nodes?.map((track: any, index: number) => (
                      <TrackNFTCard
                        key={track.id}
                        track={track}
                        onPlay={() => handlePlayTrack(track, index, favoriteTracksData?.favoriteTracks?.nodes || [])}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                        listView={false}
                        onFavorite={async () => {
                          await toggleFavorite({ variables: { trackId: track.id } })
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No liked tracks yet</p>
                    <p className="text-xs text-gray-500">Like tracks by clicking the heart icon on any song</p>
                    <Button onClick={() => setSelectedView('dashboard')} className="mt-4 retro-button">
                      <Music className="w-4 h-4 mr-2" />
                      Discover Music
                    </Button>
                  </div>
                )}
              </Card>

              {/* Owned NFTs Section */}
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ImageIcon className="w-6 h-6 text-purple-400" />
                  <h2 className="retro-title text-xl">Owned NFTs</h2>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">{ownedTracksData?.groupedTracks?.nodes?.length || 0}</Badge>
                  {ownedTracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Loading...</Badge>}
                </div>
                {ownedTracksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading owned NFTs...</span>
                  </div>
                ) : (ownedTracksData?.groupedTracks?.nodes?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    {ownedTracksData?.groupedTracks?.nodes?.slice(0, 12).map((track: any, index: number) => (
                      <CoinbaseNFTCard
                        key={track.id}
                        track={{
                          id: track.id,
                          title: track.title,
                          artist: track.artist || track.profile?.displayName || 'Unknown Artist',
                          artistProfileId: track.profile?.id,
                          artworkUrl: track.artworkMedia?.url || track.coverMedia?.url,
                          playbackCount: track.playbackCount,
                          playbackCountFormatted: track.playbackCount?.toLocaleString(),
                          nftData: {
                            tokenId: track.tokenId,
                            owner: track.owner,
                          },
                          listingItem: track.listingItem ? {
                            price: track.listingItem.price,
                            pricePerItem: track.listingItem.pricePerItem,
                            pricePerItemToShow: track.listingItem.pricePerItemToShow,
                            acceptsOGUN: track.listingItem.acceptsOGUN,
                          } : undefined,
                        }}
                        onPlay={() => handlePlayTrack(track, index, ownedTracksData?.groupedTracks?.nodes || [])}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                        onTrackClick={(trackId) => router.push(`/dex/track/${trackId}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No NFTs owned yet</p>
                    <Button onClick={() => setSelectedView('marketplace')} className="mt-4 retro-button">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  </div>
                )}
                {(ownedTracksData?.groupedTracks?.nodes?.length ?? 0) > 12 && (
                  <Button variant="ghost" className="w-full mt-4 hover:bg-purple-500/10 text-purple-400" onClick={() => setSelectedView('wallet')}>
                    View All {ownedTracksData?.groupedTracks?.nodes?.length} NFTs
                  </Button>
                )}
              </Card>

              {/* Playlists Section */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ListMusic className="w-6 h-6 text-green-400" />
                    <h2 className="retro-title text-xl">My Playlists</h2>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">{playlistsData?.getUserPlaylists?.nodes?.length || 0}</Badge>
                    {playlistsLoading && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Loading...</Badge>}
                  </div>
                  <Button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="retro-button bg-gradient-to-r from-green-500 to-cyan-500 hover:opacity-90 text-sm"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>
                {playlistsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading playlists...</span>
                  </div>
                ) : (playlistsData?.getUserPlaylists?.nodes?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {playlistsData?.getUserPlaylists?.nodes?.slice(0, 8).map((playlist: any) => (
                      <div
                        key={playlist.id}
                        className="group relative bg-neutral-800/50 rounded-lg p-3 cursor-pointer hover:bg-neutral-700/50 transition-all"
                        onClick={() => {
                          setSelectedPlaylist(playlist)
                          setShowPlaylistDetail(true)
                        }}
                      >
                        <div className="aspect-square rounded-md overflow-hidden mb-2 bg-gradient-to-br from-green-500/20 to-cyan-500/20">
                          {playlist.artworkUrl ? (
                            <img src={playlist.artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ListMusic className="w-8 h-8 text-green-400/50" />
                            </div>
                          )}
                        </div>
                        <p className="text-white text-sm font-medium truncate">{playlist.title}</p>
                        <p className="text-gray-500 text-xs">{playlist.tracks?.nodes?.length || 0} tracks</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ListMusic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No playlists yet</p>
                    <Button onClick={() => setShowCreatePlaylistModal(true)} className="mt-4 retro-button">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Playlist
                    </Button>
                  </div>
                )}
                {(playlistsData?.getUserPlaylists?.nodes?.length ?? 0) > 8 && (
                  <Button variant="ghost" className="w-full mt-4 hover:bg-green-500/10 text-green-400" onClick={() => setSelectedView('playlist')}>
                    View All {playlistsData?.getUserPlaylists?.nodes?.length} Playlists
                  </Button>
                )}
              </Card>
            </div>
          )}

          {/* Playlist View - Full Implementation */}
          {selectedView === 'playlist' && (
            <div className="space-y-6">
              {/* Header */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                      <ListMusic className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="retro-title text-xl">My Playlists</h2>
                      <p className="text-gray-400 text-sm">Curate and share your music collections</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="retro-button bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                  </Button>
                </div>

                {/* OGUN Rewards Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center">
                    <div className="text-2xl mb-1">🎵</div>
                    <h3 className="font-bold text-white text-sm">Curate</h3>
                    <p className="text-xs text-gray-400">Build your perfect playlists</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <div className="text-2xl mb-1">💰</div>
                    <h3 className="font-bold text-white text-sm">Earn OGUN</h3>
                    <p className="text-xs text-gray-400">Get rewarded for plays</p>
                  </div>
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                    <div className="text-2xl mb-1">🔥</div>
                    <h3 className="font-bold text-white text-sm">Share</h3>
                    <p className="text-xs text-gray-400">Build your audience</p>
                  </div>
                </div>
              </Card>

              {/* Playlists Grid */}
              {playlistsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-neutral-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : playlistsData?.getUserPlaylists?.nodes && playlistsData.getUserPlaylists.nodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playlistsData.getUserPlaylists.nodes.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onSelect={(p) => setSelectedPlaylist(p)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="retro-card p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                    <ListMusic className="w-10 h-10 text-neutral-600" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">No playlists yet</h3>
                  <p className="text-gray-400 mb-6">Create your first playlist to start curating your music collection</p>
                  <Button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="retro-button bg-gradient-to-r from-pink-500 to-purple-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Playlist
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Playlist Detail Modal */}
          {selectedPlaylist && (
            <PlaylistDetail
              playlist={selectedPlaylist}
              onClose={() => setSelectedPlaylist(null)}
              isOwner={selectedPlaylist.profileId === userData?.me?.profile?.id}
            />
          )}

          {/* Create Playlist Modal */}
          <CreatePlaylistModal
            isOpen={showCreatePlaylistModal}
            onClose={() => setShowCreatePlaylistModal(false)}
            onSuccess={() => {
              refetchPlaylists()
            }}
          />

          {/* Wallet View - Multi-Wallet Aggregator */}
          {selectedView === 'wallet' && (
            <div className="space-y-6">
              {/* Multi-Wallet Aggregator - Connect & View All Wallets */}
              <MultiWalletAggregator
                userWallet={userWallet}
                maticBalance={maticBalance}
                ogunBalance={ogunBalance}
                ownedTracks={ownedTracks}
                onPlayTrack={(track, index) => handlePlayTrack(track, index, ownedTracks)}
                onTrackClick={(trackId) => router.push(`/dex/track/${trackId}`)}
                currentTrackId={currentSong?.trackId}
                isPlaying={isPlaying}
                openWeb3Modal={openWeb3Modal}
              />

              {/* Header Card */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20">
                      <Wallet className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <h2 className="retro-title text-xl">Wallet Overview</h2>
                      <p className="text-gray-400 text-sm">Balances & Transactions</p>
                    </div>
                  </div>
                  {chainName && (
                    <Badge className="bg-purple-500/20 text-purple-400 px-3 py-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full inline-block mr-2 animate-pulse" />
                      {chainName}
                    </Badge>
                  )}
                </div>

                {/* Active Wallet Display - Synced Globally */}
                {isUnifiedWalletConnected && activeAddress && (
                  <Card className="metadata-section p-4 mb-4 border-cyan-500/50 bg-cyan-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-xl">
                            {activeWalletType === 'magic' ? '✨' : activeWalletType === 'metamask' ? '🦊' : '🔗'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">Active Wallet</p>
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1 animate-pulse" />
                              Connected
                            </Badge>
                          </div>
                          <p className="font-mono text-cyan-400 text-lg">{activeAddress.slice(0, 10)}...{activeAddress.slice(-8)}</p>
                          <p className="text-xs text-gray-500">
                            {activeWalletType === 'magic' ? 'SoundChain Wallet' :
                             activeWalletType === 'metamask' ? 'MetaMask' :
                             chainName || 'External Wallet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { navigator.clipboard.writeText(activeAddress); }}
                          className="hover:bg-cyan-500/20"
                        >
                          <Copy className="w-4 h-4 text-cyan-400" />
                        </Button>
                        <a href={`https://polygonscan.com/address/${activeAddress}`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="hover:bg-purple-500/20">
                            <ExternalLink className="w-4 h-4 text-purple-400" />
                          </Button>
                        </a>
                        {activeWalletType === 'web3modal' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={unifiedDisconnectWallet}
                            className="hover:bg-red-500/20 text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* OAuth Wallets Section */}
                <Card className="metadata-section p-4 mb-4 border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-purple-400">🔐</span>
                    <h4 className="text-sm font-bold text-white">OAuth Wallets</h4>
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs">Magic.link</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Each login method creates a unique wallet on Polygon.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Email Wallet */}
                    <div className={`p-3 rounded-lg border ${userData?.me?.emailWalletAddress ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 border-dashed'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>📧</span>
                        <span className="text-xs text-gray-400">Email</span>
                      </div>
                      {userData?.me?.emailWalletAddress ? (
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-cyan-400 text-xs">{userData.me.emailWalletAddress.slice(0, 6)}...{userData.me.emailWalletAddress.slice(-4)}</p>
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(userData?.me?.emailWalletAddress || '')} className="h-6 w-6 p-0">
                            <Copy className="w-3 h-3 text-cyan-400" />
                          </Button>
                        </div>
                      ) : <p className="text-gray-600 text-xs">Not connected</p>}
                    </div>
                    {/* Google Wallet */}
                    <div className={`p-3 rounded-lg border ${userData?.me?.googleWalletAddress ? 'border-red-500/50 bg-red-500/5' : 'border-gray-700 border-dashed'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>🔴</span>
                        <span className="text-xs text-gray-400">Google</span>
                      </div>
                      {userData?.me?.googleWalletAddress ? (
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-red-400 text-xs">{userData.me.googleWalletAddress.slice(0, 6)}...{userData.me.googleWalletAddress.slice(-4)}</p>
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(userData?.me?.googleWalletAddress || '')} className="h-6 w-6 p-0">
                            <Copy className="w-3 h-3 text-red-400" />
                          </Button>
                        </div>
                      ) : <p className="text-gray-600 text-xs">Not connected</p>}
                    </div>
                    {/* Discord Wallet */}
                    <div className={`p-3 rounded-lg border ${userData?.me?.discordWalletAddress ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-gray-700 border-dashed'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>🟣</span>
                        <span className="text-xs text-gray-400">Discord</span>
                      </div>
                      {userData?.me?.discordWalletAddress ? (
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-indigo-400 text-xs">{userData.me.discordWalletAddress.slice(0, 6)}...{userData.me.discordWalletAddress.slice(-4)}</p>
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(userData?.me?.discordWalletAddress || '')} className="h-6 w-6 p-0">
                            <Copy className="w-3 h-3 text-indigo-400" />
                          </Button>
                        </div>
                      ) : <p className="text-gray-600 text-xs">Not connected</p>}
                    </div>
                    {/* Twitch Wallet */}
                    <div className={`p-3 rounded-lg border ${userData?.me?.twitchWalletAddress ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-700 border-dashed'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>💜</span>
                        <span className="text-xs text-gray-400">Twitch</span>
                      </div>
                      {userData?.me?.twitchWalletAddress ? (
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-purple-400 text-xs">{userData.me.twitchWalletAddress.slice(0, 6)}...{userData.me.twitchWalletAddress.slice(-4)}</p>
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(userData?.me?.twitchWalletAddress || '')} className="h-6 w-6 p-0">
                            <Copy className="w-3 h-3 text-purple-400" />
                          </Button>
                        </div>
                      ) : <p className="text-gray-600 text-xs">Not connected</p>}
                    </div>
                  </div>
                </Card>

                {/* Balance Cards - Real data from Magic wallet */}
                {walletAccount && (
                  <div className="mb-2 text-center">
                    <a
                      href={`https://polygonscan.com/address/${walletAccount}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                    >
                      Verify on Polygonscan: {walletAccount.slice(0, 8)}...{walletAccount.slice(-6)} ↗
                    </a>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="metadata-section p-4 text-center hover:border-yellow-500/50 transition-all">
                    <Coins className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">OGUN Total</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {(Number(ogunBalance || 0) + Number(stakedOgunBalance || 0)).toFixed(2)}
                    </p>
                    <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                      <p className="text-green-400/80">{ogunBalance || '0.00'} liquid</p>
                      <p className="text-orange-400/80">{stakedOgunBalance || '0.00'} staked</p>
                    </div>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-purple-500/50 transition-all">
                    <div className="w-8 h-8 mx-auto mb-2 text-purple-400">
                      <svg viewBox="0 0 38 33" fill="currentColor"><path d="M29.7 16.5l-11.7 6.7-11.7-6.7 11.7-16.5 11.7 16.5zM18 25.2l-11.7-6.7 11.7 16.5 11.7-16.5-11.7 6.7z"/></svg>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">POL</p>
                    <p className="text-xl font-bold text-purple-400">{maticBalance || '0.00'}</p>
                    <p className="text-xs text-gray-500">≈ ${maticUsdData?.maticUsd ? (Number(maticBalance || 0) * Number(maticUsdData.maticUsd)).toFixed(2) : '0.00'}</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-cyan-500/50 transition-all">
                    <ImageIcon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">NFTs</p>
                    <p className="text-xl font-bold text-cyan-400">
                      {ownedTracksLoading ? '...' : ownedTracksData?.groupedTracks?.pageInfo?.totalCount || 0}
                    </p>
                    <p className="text-xs text-gray-500">Owned</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-green-500/50 transition-all">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Total Value</p>
                    <p className="text-xl font-bold text-green-400">
                      ${maticUsdData?.maticUsd ? (Number(maticBalance || 0) * Number(maticUsdData.maticUsd)).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Portfolio</p>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <Button
                    className="retro-button bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 flex-col h-auto py-4"
                    onClick={() => document.getElementById('buy-crypto-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-xs">Buy Crypto</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-cyan-500/50 hover:bg-cyan-500/10 flex-col h-auto py-4"
                    onClick={() => document.getElementById('transfer-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    <span className="text-xs">Send</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-purple-500/50 hover:bg-purple-500/10 flex-col h-auto py-4"
                    onClick={() => {
                      if (userWallet) {
                        navigator.clipboard.writeText(userWallet)
                        alert(`📥 Receive Crypto\n\nYour wallet address copied to clipboard:\n\n${userWallet}\n\nSend POL or OGUN to this address on Polygon network.`)
                      } else {
                        alert('Please connect your wallet first.')
                      }
                    }}
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    <span className="text-xs">Receive</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/50 hover:bg-yellow-500/10 flex-col h-auto py-4"
                    onClick={() => document.getElementById('swap-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    <span className="text-xs">Swap</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-orange-500/30 hover:bg-orange-500/5 flex-col h-auto py-4 relative opacity-60 cursor-not-allowed"
                    onClick={() => toast.info('🧹 Sweep Tool Coming Soon! Batch transfer NFTs with a single transaction.')}
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="text-xs">Sweep</span>
                    <Badge className="absolute -top-2 -right-2 bg-orange-500/20 text-orange-400 text-[8px] px-1">Soon</Badge>
                  </Button>
                </div>
              </Card>

              {/* Buy Crypto Section */}
              <Card id="buy-crypto-section" className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Plus className="w-6 h-6 text-green-400" />
                  <h3 className="retro-title text-lg">Buy Crypto</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">Purchase POL on Polygon to mint NFTs and pay gas fees.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <a href="https://ramp.network/" target="_blank" rel="noreferrer">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <span className="text-lg">🔷</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors">Ramp Network</h4>
                            <p className="text-xs text-gray-400">Card & Bank Transfer</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                      </div>
                    </Card>
                  </a>
                  <a href="https://www.moonpay.com/" target="_blank" rel="noreferrer">
                    <Card className="metadata-section p-4 hover:border-purple-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-lg">🌙</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">MoonPay</h4>
                            <p className="text-xs text-gray-400">Card & Apple Pay</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                      </div>
                    </Card>
                  </a>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-3">Exchanges (Buy & Withdraw to Polygon)</p>
                  <div className="flex flex-wrap gap-3">
                    <a href="https://www.binance.us/" target="_blank" rel="noreferrer" className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-xs hover:bg-yellow-500/20 transition-all">Binance</a>
                    <a href="https://crypto.com/us/app" target="_blank" rel="noreferrer" className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Crypto.com</a>
                    <a href="https://www.okcoin.com/" target="_blank" rel="noreferrer" className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs hover:bg-cyan-500/20 transition-all">OKCoin</a>
                    <a href="https://www.mexc.com/" target="_blank" rel="noreferrer" className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs hover:bg-green-500/20 transition-all">MEXC</a>
                    <a href="https://www.coinbase.com/" target="_blank" rel="noreferrer" className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Coinbase</a>
                  </div>
                </div>
              </Card>

              {/* Bridge Section */}
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-6 h-6 text-purple-400" />
                  <h3 className="retro-title text-lg">Bridge Assets</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">Move assets across chains - Polygon, Ethereum, ZetaChain & more.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ZetaChain Bridge - Featured */}
                  <a href="https://www.zetachain.com/docs/developers/cross-chain-messaging/" target="_blank" rel="noreferrer">
                    <Card className="metadata-section p-4 hover:border-green-500/50 transition-all cursor-pointer group border-green-500/30 bg-green-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <span className="text-2xl">🟢</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white group-hover:text-green-400 transition-colors">ZetaChain Bridge</h4>
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Coming Soon</Badge>
                            </div>
                            <p className="text-xs text-gray-400">Universal cross-chain: BTC, ETH, BNB, Polygon</p>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-green-400" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-orange-500/20 text-orange-400 text-xs">Bitcoin</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">Ethereum</Badge>
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">BNB</Badge>
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">Polygon</Badge>
                      </div>
                    </Card>
                  </a>

                  {/* Polygon Bridge */}
                  <a href="https://wallet.polygon.technology/" target="_blank" rel="noreferrer">
                    <Card className="metadata-section p-4 hover:border-purple-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <span className="text-2xl">🌉</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">Polygon Bridge</h4>
                            <p className="text-xs text-gray-400">Ethereum ↔ Polygon transfers</p>
                          </div>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400" />
                      </div>
                    </Card>
                  </a>
                </div>

                {/* ZetaChain Info Banner */}
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="font-bold text-green-400 text-sm mb-1">ZetaChain Omnichain Integration</h4>
                      <p className="text-xs text-gray-400 mb-2">
                        SoundChain is integrating ZetaChain for universal cross-chain capabilities. Soon you'll be able to:
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Bridge OGUN tokens across all major chains</li>
                        <li>• Receive payments in BTC, ETH, BNB, or POL</li>
                        <li>• Single wallet address works on all chains</li>
                        <li>• Native Bitcoin NFT support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ZetaChain Omnichain Swap Portal */}
              <Card id="swap-section" className="retro-card p-6 border-green-500/30 relative overflow-hidden">
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-cyan-500/5 animate-pulse" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30">
                        <span className="text-2xl">ζ</span>
                      </div>
                      <div>
                        <h3 className="retro-title text-lg flex items-center gap-2">
                          Omnichain Swap Portal
                          <Badge className="bg-green-500/20 text-green-400 text-xs">LIVE</Badge>
                        </h3>
                        <p className="text-gray-400 text-sm">Swap tokens across 23+ blockchains</p>
                      </div>
                    </div>
                    <a href="https://www.zetachain.com" target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10">
                        <span className="text-xs">Powered by ZetaChain</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  </div>

                  {/* Swap Interface */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* From Section */}
                    <Card className="metadata-section p-4 border-gray-700">
                      <p className="text-xs text-gray-400 mb-3">From</p>
                      <div className="flex items-center gap-3 mb-4">
                        <select
                          value={swapFromToken}
                          onChange={(e) => setSwapFromToken(e.target.value as Token)}
                          className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                        >
                          {SUPPORTED_TOKENS.map((token) => (
                            <option key={token} value={token}>
                              {TOKEN_INFO[token].icon || '🪙'} {getDisplaySymbol(token)} - {TOKEN_INFO[token].name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.0"
                          value={swapFromAmount}
                          onChange={(e) => setSwapFromAmount(e.target.value)}
                          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-xl text-white focus:border-green-500 focus:outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-green-400 text-xs h-7 px-2">MAX</Button>
                          <span className="text-gray-400 flex items-center gap-1">
                            {TOKEN_INFO[swapFromToken]?.icon} {getDisplaySymbol(swapFromToken)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Balance: {swapFromToken === 'MATIC' ? (maticBalance || '0.00') : swapFromToken === 'OGUN' ? (ogunBalance || '0.00') : '0.00'} {getDisplaySymbol(swapFromToken)}</p>
                    </Card>

                    {/* To Section */}
                    <Card className="metadata-section p-4 border-gray-700">
                      <p className="text-xs text-gray-400 mb-3">To</p>
                      <div className="flex items-center gap-3 mb-4">
                        <select
                          value={swapToToken}
                          onChange={(e) => setSwapToToken(e.target.value as Token)}
                          className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
                        >
                          {SUPPORTED_TOKENS.map((token) => (
                            <option key={token} value={token}>
                              {TOKEN_INFO[token].icon || '🪙'} {getDisplaySymbol(token)} - {TOKEN_INFO[token].name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.0"
                          value={swapFromAmount ? (parseFloat(swapFromAmount) * 0.9995).toFixed(4) : ''}
                          readOnly
                          className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 text-xl text-white cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="text-gray-400 flex items-center gap-1">
                            {TOKEN_INFO[swapToToken]?.icon} {getDisplaySymbol(swapToToken)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-yellow-500/80 mt-2">⚠️ Swap coming soon - ZetaChain integration in progress</p>
                    </Card>
                  </div>

                  {/* Swap Arrow */}
                  <div className="flex justify-center -my-2 relative z-20">
                    <Button variant="outline" size="sm" className="rounded-full w-10 h-10 border-green-500/50 hover:bg-green-500/10">
                      <RefreshCw className="w-4 h-4 text-green-400" />
                    </Button>
                  </div>

                  {/* Supported Chains Grid */}
                  <div className="mt-6">
                    <p className="text-xs text-gray-400 mb-3">Supported Chains (23+)</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-2">
                      {[
                        { icon: '₿', name: 'Bitcoin', color: '#F7931A' },
                        { icon: '🔷', name: 'Ethereum', color: '#627EEA' },
                        { icon: '⬡', name: 'Polygon', color: '#8247E5' },
                        { icon: '🔵', name: 'Base', color: '#0052FF' },
                        { icon: '🔵', name: 'Arbitrum', color: '#28A0F0' },
                        { icon: '🔴', name: 'Optimism', color: '#FF0420' },
                        { icon: '🔺', name: 'Avalanche', color: '#E84142' },
                        { icon: '🟡', name: 'BNB', color: '#F0B90B' },
                        { icon: '◎', name: 'Solana', color: '#14F195' },
                        { icon: 'ζ', name: 'ZetaChain', color: '#00D4AA' },
                        { icon: '💥', name: 'Blast', color: '#FCFC03' },
                      ].map((chain) => (
                        <div
                          key={chain.name}
                          className="flex flex-col items-center p-2 rounded-lg bg-black/30 border border-gray-800 hover:border-green-500/50 transition-all cursor-pointer group"
                        >
                          <span className="text-lg mb-1">{chain.icon}</span>
                          <span className="text-[10px] text-gray-500 group-hover:text-green-400 transition-colors truncate w-full text-center">{chain.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Swap Button */}
                  <Button
                    className="w-full mt-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-3 rounded-xl cursor-not-allowed opacity-70"
                    disabled={true}
                  >
                    🚧 Swap Coming Soon - ZetaChain Integration
                  </Button>

                  {/* Info Footer */}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>Fee: 0.05%</span>
                      <span>•</span>
                      <span>Est. Time: ~30s</span>
                    </div>
                    <a href="https://explorer.zetachain.com" target="_blank" rel="noreferrer" className="text-green-400 hover:text-green-300 flex items-center gap-1">
                      ZetaScan <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Your NFT Collection - Figma-style Connected Wallets Design */}
              {ownedTracksLoading ? (
                <Card className="retro-card p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading your NFTs...</span>
                  </div>
                </Card>
              ) : ownedTracksError ? (
                <Card className="retro-card p-6">
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400 text-sm font-medium mb-2">Failed to load NFTs</p>
                    <p className="text-gray-500 text-xs mb-4">{ownedTracksError.message || 'Network error'}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="retro-button"
                      size="sm"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </Card>
              ) : ownedTracks.length > 0 ? (
                <WalletNFTCollection
                  walletAddress={userWallet || ''}
                  balance={maticBalance || '0'}
                  currency="MATIC"
                  chainName="Polygon"
                  nfts={ownedTracks.map((track: any) => ({
                    id: track.id,
                    title: track.title,
                    artist: track.artist || track.profile?.displayName || 'Unknown Artist',
                    artworkUrl: track.artworkUrl,
                    audioUrl: track.playbackUrl,
                    tokenId: track.nftData?.tokenId || track.tokenId,
                  }))}
                  onPlayTrack={(nft, index) => {
                    const track = ownedTracks.find((t: any) => t.id === nft.id)
                    if (track) handlePlayTrack(track, index, ownedTracks)
                  }}
                  onTrackClick={(trackId) => router.push(`/dex/track/${trackId}`)}
                  currentTrackId={currentSong?.trackId}
                  isPlaying={isPlaying}
                />
              ) : (
                <Card className="retro-card p-6">
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No NFTs owned yet</p>
                    <p className="text-gray-500 text-xs mt-1">Wallet: {userWallet?.slice(0, 8)}...{userWallet?.slice(-6)}</p>
                    <Button onClick={() => setSelectedView('marketplace')} className="mt-3 retro-button" size="sm">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  </div>
                </Card>
              )}

              {/* Transfer NFTs Section */}
              <Card id="transfer-section" className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Share2 className="w-6 h-6 text-purple-400" />
                  <h3 className="retro-title text-lg">Transfer NFTs</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">Send your music NFTs to another wallet address.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Recipient Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Select NFT</label>
                    <select
                      value={selectedNftId}
                      onChange={(e) => setSelectedNftId(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-3 text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Select an NFT to transfer</option>
                      {ownedTracks.map((track) => (
                        <option key={track.id} value={track.id}>{track.title} - {track.artist}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-purple-500/50 hover:bg-purple-500/10 text-purple-400"
                    disabled={!userWallet || !transferRecipient || !selectedNftId || transferring}
                    onClick={handleTransferNFT}
                  >
                    {transferring ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full mr-2" />
                        Transferring...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Transfer NFT
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Transaction History - Real Data */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                    <h3 className="retro-title text-lg">Recent Activity</h3>
                  </div>
                  {walletAccount && (
                    <a href={`https://polygonscan.com/address/${walletAccount}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="text-xs text-cyan-400 hover:bg-cyan-500/10">
                        View All <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>

                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-10 h-10 bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transactionData?.getTransactionHistory?.result?.length ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {transactionData.getTransactionHistory.result.slice(0, 10).map((tx: any) => {
                      const isIncoming = tx.to?.toLowerCase() === walletAccount?.toLowerCase()
                      const valueInMatic = tx.value ? (parseFloat(tx.value) / 1e18).toFixed(4) : '0'
                      const usdValue = maticUsdData?.maticUsd ? (parseFloat(valueInMatic) * parseFloat(maticUsdData.maticUsd)).toFixed(2) : '0.00'
                      const date = tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString() : ''

                      return (
                        <a
                          key={tx.hash}
                          href={`https://polygonscan.com/tx/${tx.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncoming ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <span className={`text-lg ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                              {isIncoming ? '↓' : '↑'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white font-medium">
                                {isIncoming ? 'Received' : 'Sent'} {valueInMatic} POL
                              </p>
                              <Badge className={`text-xs ${isIncoming ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                ${usdValue}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {isIncoming ? 'From' : 'To'}: {(isIncoming ? tx.from : tx.to)?.slice(0, 10)}...{(isIncoming ? tx.from : tx.to)?.slice(-6)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{date}</p>
                            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No recent transactions</p>
                    <p className="text-xs text-gray-600 mt-1">Your transaction history will appear here</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Settings View */}
          {selectedView === 'settings' && (
            <div className="space-y-6">
              {/* Settings sub-route forms */}
              {routeId === 'bio' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Edit Bio</h2>
                  </div>
                  <BioForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Bio" />
                </Card>
              )}
              {routeId === 'profile-picture' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Profile Picture</h2>
                  </div>
                  <ProfilePictureForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Picture" />
                </Card>
              )}
              {routeId === 'cover-picture' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Cover Picture</h2>
                  </div>
                  <CoverPictureForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Cover" />
                </Card>
              )}
              {routeId === 'social-links' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Social Links</h2>
                  </div>
                  <SocialLinksForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Links" />
                </Card>
              )}
              {routeId === 'security' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Security</h2>
                  </div>
                  <SecurityForm afterSubmit={() => router.push('/dex/settings')} />
                </Card>
              )}
              {/* Main settings menu - show when no sub-route */}
              {!routeId && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon className="w-8 h-8 text-gray-400" />
                    <h2 className="retro-title text-xl">Settings</h2>
                  </div>
                  <p className="text-gray-400 mb-6">Manage your account, profile, and preferences.</p>

                  {/* Profile Preview */}
                  <div className="flex items-center gap-4 mb-6 p-4 bg-black/30 rounded-xl border border-cyan-500/20">
                    <div className="relative">
                      <img
                        src={userData?.me?.profile?.profilePicture || '/default-pictures/profile/default.png'}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{userData?.me?.profile?.displayName || 'Your Name'}</h3>
                      <p className="text-cyan-400 text-sm">@{userData?.me?.handle || 'username'}</p>
                      <p className="text-gray-500 text-xs truncate">{userData?.me?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link href="/dex/settings/bio">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm">Bio</h3>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {userData?.me?.profile?.bio || 'Add a bio...'}
                            </p>
                          </div>
                          <span className="text-cyan-400 ml-2">→</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/dex/settings/profile-picture">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Profile Picture</h3>
                            <p className="text-xs text-gray-400 mt-1">Update your avatar</p>
                          </div>
                          <span className="text-cyan-400">→</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/dex/settings/cover-picture">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Cover Picture</h3>
                            <p className="text-xs text-gray-400 mt-1">Update your banner</p>
                          </div>
                          <span className="text-cyan-400">→</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/dex/settings/social-links">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Social Links</h3>
                            <p className="text-xs text-gray-400 mt-1">Connect your socials</p>
                          </div>
                          <span className="text-cyan-400">→</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/dex/settings/security">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Security</h3>
                            <p className="text-xs text-gray-400 mt-1">
                              2FA: {userData?.me?.otpSecret ? <span className="text-green-400">Enabled</span> : <span className="text-red-400">Disabled</span>}
                            </p>
                          </div>
                          <span className="text-cyan-400">→</span>
                        </div>
                      </Card>
                    </Link>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Messages View - Full DM System */}
          {selectedView === 'messages' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
              {/* Conversations List */}
              <Card className="retro-card overflow-hidden lg:col-span-1">
                <div className="p-4 border-b border-cyan-500/30">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
                    <h2 className="retro-title text-lg">Messages</h2>
                  </div>
                </div>
                <div className="overflow-y-auto h-[calc(100%-60px)]">
                  {chatsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (chatsData?.chats?.nodes?.length ?? 0) > 0 ? (
                    <div className="divide-y divide-gray-800">
                      {chatsData?.chats?.nodes?.map((chat: any) => (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChatId(chat.id)}
                          className={`p-4 cursor-pointer hover:bg-cyan-500/5 transition-colors ${selectedChatId === chat.id ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              {chat.profile?.profilePicture ? (
                                <AvatarImage src={chat.profile.profilePicture} />
                              ) : null}
                              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white">
                                {chat.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white truncate">{chat.profile?.displayName || 'Unknown'}</p>
                                {chat.unread && (
                                  <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-gray-400 truncate">{chat.message}</p>
                              <p className="text-xs text-gray-600">{new Date(chat.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No conversations yet</p>
                      <p className="text-xs text-gray-600 mt-1">Visit an artist's profile to start a chat</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Chat Window */}
              <Card className="retro-card overflow-hidden lg:col-span-2 flex flex-col">
                {selectedChatId ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-cyan-500/30 flex items-center gap-3">
                      {chatHistoryData?.chatHistory?.nodes?.[0]?.fromProfile && (
                        <>
                          <Avatar className="w-10 h-10">
                            {(chatHistoryData.chatHistory.nodes[0].fromProfile as any)?.profilePicture ? (
                              <AvatarImage src={(chatHistoryData.chatHistory.nodes[0].fromProfile as any).profilePicture} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white">
                              {(chatHistoryData.chatHistory.nodes[0].fromProfile as any)?.displayName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{(chatHistoryData.chatHistory.nodes[0].fromProfile as any)?.displayName}</p>
                            <p className="text-xs text-gray-400">@{(chatHistoryData.chatHistory.nodes[0].fromProfile as any)?.userHandle}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatHistoryLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        </div>
                      ) : (
                        chatHistoryData?.chatHistory?.nodes?.map((message: any) => {
                          const isMe = message.fromId === user?.id
                          return (
                            <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-white'}`}>
                                <p className="text-sm">{message.message}</p>
                                <p className={`text-xs mt-1 ${isMe ? 'text-cyan-900' : 'text-gray-500'}`}>
                                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-cyan-500/30">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (messageInput.trim() && selectedChatId) {
                            sendMessage({
                              variables: {
                                input: {
                                  message: messageInput.trim(),
                                  toId: selectedChatId,
                                }
                              }
                            })
                          }
                        }}
                        className="flex gap-3"
                      >
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-black/50 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                          maxLength={1000}
                        />
                        <Button
                          type="submit"
                          className="retro-button"
                          disabled={!messageInput.trim() || sendingMessage}
                        >
                          {sendingMessage ? (
                            <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                          ) : (
                            'Send'
                          )}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Select a conversation</p>
                      <p className="text-xs text-gray-600 mt-1">Choose from your messages on the left</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Notifications View - Full Notifications Page */}
          {selectedView === 'notifications' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-yellow-400" />
                    <h2 className="retro-title text-xl">Notifications</h2>
                    {notificationsLoading && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Loading...</Badge>}
                  </div>
                  {(notificationsData?.notifications?.nodes?.length ?? 0) > 0 && (
                    <Badge className="bg-cyan-500/20 text-cyan-400">
                      {notificationsData?.notifications?.nodes?.length} total
                    </Badge>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading notifications...</span>
                  </div>
                ) : (notificationsData?.notifications?.nodes?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    {notificationsData?.notifications?.nodes?.map((notification: any) => {
                      const getNotificationIcon = () => {
                        switch (notification.type) {
                          case 'NewPost': return <MessageCircle className="w-5 h-5 text-blue-400" />
                          case 'Comment': return <MessageCircle className="w-5 h-5 text-green-400" />
                          case 'Reaction': return <Heart className="w-5 h-5 text-red-400" />
                          case 'Follower': return <Users className="w-5 h-5 text-purple-400" />
                          case 'NewBid': return <TrendingUp className="w-5 h-5 text-orange-400" />
                          case 'Outbid': return <TrendingUp className="w-5 h-5 text-yellow-400" />
                          case 'WonAuction': return <Trophy className="w-5 h-5 text-gold-400" />
                          case 'AuctionEnded': return <Zap className="w-5 h-5 text-cyan-400" />
                          case 'NFTSold': return <Coins className="w-5 h-5 text-green-400" />
                          default: return <Bell className="w-5 h-5 text-gray-400" />
                        }
                      }
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border transition-colors ${notification.readAt ? 'bg-black/20 border-gray-800' : 'bg-cyan-500/5 border-cyan-500/30'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-black/30">
                              {getNotificationIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium">{notification.body || notification.type}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                            {!notification.readAt && (
                              <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg mb-2">No notifications yet</p>
                    <p className="text-xs text-gray-500">When you get likes, follows, or sales you'll see them here</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Staking View - OGUN Staking Panel */}
          {selectedView === 'staking' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                    <Coins className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="retro-title text-xl">OGUN Staking</h2>
                    <p className="text-gray-400 text-sm">Stake OGUN to earn streaming rewards</p>
                  </div>
                </div>
              </Card>
              <StakingPanel />
            </div>
          )}

          {/* Feedback View - Google Forms iframe */}
          {selectedView === 'feedback' && (
            <div className="space-y-6">
              <Card className="retro-card overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-cyan-500/30">
                  <Feedback className="w-6 h-6 text-cyan-400" />
                  <h2 className="retro-title text-lg">Leave Feedback</h2>
                </div>
                <iframe
                  src="https://docs.google.com/forms/d/e/1FAIpQLScmoMksAwl26GABnutNksgWOlfDGvfZbGeEqAiaSqIHo5sI9g/viewform?embedded=true"
                  className="w-full h-[calc(100vh-200px)] min-h-[600px]"
                  title="Feedback form"
                />
              </Card>
            </div>
          )}

          {/* Admin Panel View - Verification Requests */}
          {selectedView === 'admin' && userData?.me?.roles?.includes(Role.Admin) && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <VerifiedIcon className="w-8 h-8 text-green-400" />
                  <h2 className="retro-title text-xl">Admin Panel</h2>
                </div>
                <p className="text-gray-400 mb-4">Manage verification requests and platform administration.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/manage-requests">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Verification Requests</h3>
                      <p className="text-xs text-gray-400">Review pending artist verification requests</p>
                    </Card>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* Track Detail View - /dex/track/[id] */}
          {selectedView === 'track' && routeId && (
            <div className="space-y-6 pb-32 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {trackDetailLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-cyan-400">Loading track details...</span>
                </div>
              )}
              {trackDetailError && (
                <Card className="retro-card p-6 text-center">
                  <p className="text-red-400 mb-2">Error loading track</p>
                  <p className="text-gray-500 text-sm">{trackDetailError.message}</p>
                </Card>
              )}
              {trackDetailData?.track && (
                <>
                  {/* Dynamic SEO for track sharing with inline playable cards */}
                  <Head>
                    <title>{trackDetailData.track.title} by {trackDetailData.track.artist} | SoundChain</title>
                    <meta name="description" content={`Listen to ${trackDetailData.track.title} by ${trackDetailData.track.artist} on SoundChain - Web3 Music Platform`} />

                    {/* Open Graph - Basic */}
                    <meta property="og:title" content={`${trackDetailData.track.title} by ${trackDetailData.track.artist}`} />
                    <meta property="og:description" content={`Listen to ${trackDetailData.track.title} on SoundChain. ${trackDetailData.track.artist}. Stream now!`} />
                    <meta property="og:url" content={`${config.domainUrl}/dex/track/${trackDetailData.track.id}`} />
                    <meta property="og:site_name" content="SoundChain" />

                    {/* Open Graph - Video/Audio for inline playback */}
                    {trackDetailData.track.playbackUrl ? (
                      <>
                        <meta property="og:type" content="video.other" />
                        <meta property="og:video" content={`${config.domainUrl}/embed/track/${trackDetailData.track.id}`} />
                        <meta property="og:video:secure_url" content={`${config.domainUrl}/embed/track/${trackDetailData.track.id}`} />
                        <meta property="og:video:type" content="text/html" />
                        <meta property="og:video:width" content="480" />
                        <meta property="og:video:height" content="360" />
                        <meta property="og:image" content={trackDetailData.track.artworkUrl || `${config.domainUrl}/soundchain-meta-logo.png`} />
                        <meta property="og:image:width" content="1200" />
                        <meta property="og:image:height" content="1200" />
                      </>
                    ) : (
                      <>
                        <meta property="og:type" content="music.song" />
                        <meta property="og:image" content={trackDetailData.track.artworkUrl || `${config.domainUrl}/soundchain-meta-logo.png`} />
                        <meta property="og:image:width" content="1200" />
                        <meta property="og:image:height" content="1200" />
                      </>
                    )}

                    {/* Twitter Player Card for inline playback */}
                    {trackDetailData.track.playbackUrl ? (
                      <>
                        <meta name="twitter:card" content="player" />
                        <meta name="twitter:title" content={`${trackDetailData.track.title} by ${trackDetailData.track.artist}`} />
                        <meta name="twitter:description" content={`Listen on SoundChain - Web3 Music Platform`} />
                        <meta name="twitter:image" content={trackDetailData.track.artworkUrl || `${config.domainUrl}/soundchain-meta-logo.png`} />
                        <meta name="twitter:site" content="@SoundChainFM" />
                        <meta name="twitter:player" content={`${config.domainUrl}/embed/track/${trackDetailData.track.id}`} />
                        <meta name="twitter:player:width" content="480" />
                        <meta name="twitter:player:height" content="360" />
                      </>
                    ) : (
                      <>
                        <meta name="twitter:card" content="summary_large_image" />
                        <meta name="twitter:title" content={`${trackDetailData.track.title} by ${trackDetailData.track.artist}`} />
                        <meta name="twitter:description" content={`Listen on SoundChain - Web3 Music Platform`} />
                        <meta name="twitter:image" content={trackDetailData.track.artworkUrl || `${config.domainUrl}/soundchain-meta-logo.png`} />
                        <meta name="twitter:site" content="@SoundChainFM" />
                      </>
                    )}

                    {/* oEmbed Discovery */}
                    <link
                      rel="alternate"
                      type="application/json+oembed"
                      href={`${config.domainUrl}/api/oembed?url=${encodeURIComponent(`${config.domainUrl}/dex/track/${trackDetailData.track.id}`)}`}
                      title={`${trackDetailData.track.title} by ${trackDetailData.track.artist}`}
                    />

                    <link rel="canonical" href={`${config.domainUrl}/dex/track/${trackDetailData.track.id}`} />
                  </Head>

                  {/* Back Button */}
                  <Button variant="ghost" onClick={() => router.back()} className="mb-4 hover:bg-cyan-500/10">
                    <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                    Back
                  </Button>

                  {/* Track Header Card */}
                  <Card className="retro-card overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Album Art */}
                      <div className="w-full md:w-80 aspect-square relative bg-gray-800">
                        <img
                          src={trackDetailData.track.artworkUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'}
                          alt={trackDetailData.track.title || 'Track'}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          onClick={() => {
                            const track = trackDetailData.track
                            if (track) {
                              const playlist: Song[] = [{
                                trackId: track.id,
                                src: track.playbackUrl || '',
                                title: track.title || 'Untitled',
                                artist: track.artist || 'Unknown',
                                art: track.artworkUrl || '',
                                isFavorite: track.isFavorite || false,
                              }]
                              playlistState(playlist, 0)
                            }
                          }}
                          className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center shadow-lg"
                        >
                          {isPlaying && currentSong?.trackId === trackDetailData.track.id ? (
                            <Pause className="w-6 h-6 text-black" />
                          ) : (
                            <Play className="w-6 h-6 text-black ml-1" />
                          )}
                        </Button>
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 p-6 space-y-4">
                        <div>
                          <h1 className="text-3xl font-bold text-white mb-2">{trackDetailData.track.title}</h1>
                          {/* Artist - Clickable Link to Profile */}
                          {trackDetailData.track.artist ? (
                            <Link href={`/dex/users/${trackDetailData.track.artist}`}>
                              <p className="text-cyan-400 text-lg hover:text-cyan-300 cursor-pointer transition-colors">
                                {trackDetailData.track.artist}
                              </p>
                            </Link>
                          ) : (
                            <p className="text-cyan-400 text-lg">Unknown Artist</p>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">{trackDetailData.track.playbackCountFormatted || '0'} plays</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Heart className={`w-4 h-4 ${trackDetailData.track.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                            <span className="text-white">{trackDetailData.track.favoriteCount || 0} favorites</span>
                          </div>
                          {trackDetailData.track.album && (
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-purple-400" />
                              <span className="text-white">{trackDetailData.track.album}</span>
                            </div>
                          )}
                        </div>

                        {/* Price Badge if Listed */}
                        {trackDetailData.track.price && (
                          <Badge className="bg-green-500/20 text-green-400 text-lg px-4 py-2">
                            {trackDetailData.track.price.value} {trackDetailData.track.price.currency}
                          </Badge>
                        )}

                        {/* SCid (SoundChain ID) - Web3 Music Identifier */}
                        {scidData?.scidByTrack?.scid && (
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-xl">
                            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-purple-400 font-mono text-sm">SC</span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider">SoundChain ID</p>
                              <p className="text-white font-mono text-sm">{scidData.scidByTrack.scid}</p>
                              {scidData.scidByTrack.streamCount > 0 && (
                                <p className="text-xs text-cyan-400 mt-0.5">
                                  {scidData.scidByTrack.streamCount.toLocaleString()} streams · {scidData.scidByTrack.ogunRewardsEarned?.toFixed(2) || '0'} OGUN earned
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4">
                          <Button
                            className={trackDetailData.track.isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : "retro-button"}
                            onClick={async () => {
                              if (!me) {
                                router.push('/login')
                                return
                              }
                              await toggleFavorite({ variables: { trackId: trackDetailData.track.id } })
                            }}
                          >
                            <Heart className={`w-4 h-4 mr-2 ${trackDetailData.track.isFavorite ? 'fill-current' : ''}`} />
                            {trackDetailData.track.isFavorite ? 'Favorited' : 'Favorite'}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-cyan-500/50 hover:bg-cyan-500/10"
                            onClick={async () => {
                              const shareData = {
                                title: `${trackDetailData.track.title} by ${trackDetailData.track.artist}`,
                                text: `Listen to ${trackDetailData.track.title} on SoundChain`,
                                url: `${window.location.origin}/dex/track/${trackDetailData.track.id}`,
                              }
                              if (navigator.share) {
                                await navigator.share(shareData)
                              } else {
                                await navigator.clipboard.writeText(shareData.url)
                                alert('Link copied to clipboard!')
                              }
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                          {trackDetailData.track.price && (
                            <Button
                              className="bg-green-500 hover:bg-green-600 text-black font-bold"
                              onClick={() => router.push(`/tracks/${trackDetailData.track.id}/buy-now`)}
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Buy NFT
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Track Details Card */}
                  <Card className="retro-card">
                    <CardContent className="p-6">
                      <h2 className="retro-title text-lg mb-4">Track Details</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Track Title</span>
                            <span className="text-white">{trackDetailData.track.title || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Album</span>
                            <span className="text-white">{trackDetailData.track.album || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Release Year</span>
                            <span className="text-white">{trackDetailData.track.releaseYear || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Copyright</span>
                            <span className="text-white">{trackDetailData.track.copyright || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">ISRC</span>
                            <span className="text-white font-mono text-sm">{trackDetailData.track.ISRC || '-'}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="py-2 border-b border-gray-800">
                            <span className="text-gray-400 block mb-2">Genres</span>
                            <div className="flex flex-wrap gap-2">
                              {(trackDetailData.track.genres?.length ?? 0) > 0 ? (
                                trackDetailData.track.genres?.map((genre) => (
                                  <Badge key={genre} className="bg-purple-500/20 text-purple-400">{genre}</Badge>
                                ))
                              ) : (
                                <span className="text-gray-500">No genres</span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Edition Size</span>
                            <span className="text-white">{trackDetailData.track.editionSize || 1}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">Created</span>
                            <span className="text-white">{new Date(trackDetailData.track.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Description Card - URLs are clickable for artist marketing */}
                  {trackDetailData.track.description && (
                    <Card className="retro-card">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4">Description</h2>
                        <p className="text-gray-300 whitespace-pre-wrap">{linkifyText(trackDetailData.track.description)}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Utility Card - URLs are clickable for artist marketing */}
                  {trackDetailData.track.utilityInfo && (
                    <Card className="retro-card border-yellow-500/30">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          Utility
                        </h2>
                        <p className="text-gray-300 whitespace-pre-wrap">{linkifyText(trackDetailData.track.utilityInfo)}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* NFT / Blockchain Data Card */}
                  {trackDetailData.track.nftData && (
                    <Card className="retro-card border-purple-500/30">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4 flex items-center gap-2">
                          <Database className="w-5 h-5 text-purple-400" />
                          Blockchain Data
                        </h2>
                        <div className="space-y-3">
                          {/* Token ID - Clickable Link to Polygonscan */}
                          <div className="flex flex-col md:flex-row md:justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400 mb-1 md:mb-0">Token ID</span>
                            {trackDetailData.track.nftData.transactionHash ? (
                              <a
                                href={`${config.polygonscan}tx/${trackDetailData.track.nftData.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-sm"
                              >
                                {trackDetailData.track.nftData.tokenId || 'View on Polygonscan'}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-500">Not minted</span>
                            )}
                          </div>
                          {/* Contract Address */}
                          {trackDetailData.track.nftData.contract && (
                            <div className="flex flex-col md:flex-row md:justify-between py-2 border-b border-gray-800">
                              <span className="text-gray-400 mb-1 md:mb-0">Contract</span>
                              <a
                                href={`${config.polygonscan}address/${trackDetailData.track.nftData.contract}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-sm"
                              >
                                {trackDetailData.track.nftData.contract.slice(0, 8)}...{trackDetailData.track.nftData.contract.slice(-6)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {/* IPFS */}
                          {trackDetailData.track.nftData.ipfsCid && (
                            <div className="flex flex-col md:flex-row md:justify-between py-2 border-b border-gray-800">
                              <span className="text-gray-400 mb-1 md:mb-0">IPFS</span>
                              <a
                                href={`${config.ipfsGateway}${trackDetailData.track.nftData.ipfsCid}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-sm"
                              >
                                {trackDetailData.track.nftData.ipfsCid.slice(0, 12)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {/* Minter */}
                          {trackDetailData.track.nftData.minter && (
                            <div className="flex flex-col md:flex-row md:justify-between py-2 border-b border-gray-800">
                              <span className="text-gray-400 mb-1 md:mb-0">Minter</span>
                              <a
                                href={`${config.polygonscan}address/${trackDetailData.track.nftData.minter}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-sm"
                              >
                                {trackDetailData.track.nftData.minter.slice(0, 8)}...{trackDetailData.track.nftData.minter.slice(-6)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          {/* Owner */}
                          {trackDetailData.track.nftData.owner && (
                            <div className="flex flex-col md:flex-row md:justify-between py-2 border-b border-gray-800">
                              <span className="text-gray-400 mb-1 md:mb-0">Current Owner</span>
                              <a
                                href={`${config.polygonscan}address/${trackDetailData.track.nftData.owner}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-sm"
                              >
                                {trackDetailData.track.nftData.owner.slice(0, 8)}...{trackDetailData.track.nftData.owner.slice(-6)}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                          <div className="flex justify-between py-2">
                            <span className="text-gray-400">Chain</span>
                            <Badge className="bg-purple-500/20 text-purple-400">Polygon</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Track Edition Info */}
                  {trackDetailData.track.trackEdition && (
                    <Card className="retro-card">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4">Edition Info</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-cyan-400">{trackDetailData.track.editionSize || 1}</div>
                            <div className="text-xs text-gray-400">Total Editions</div>
                          </div>
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-400">{trackDetailData.track.listingCount || 0}</div>
                            <div className="text-xs text-gray-400">Listed for Sale</div>
                          </div>
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-400">{trackDetailData.track.playbackCount || 0}</div>
                            <div className="text-xs text-gray-400">Total Plays</div>
                          </div>
                          <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-2xl font-bold text-red-400">{trackDetailData.track.favoriteCount || 0}</div>
                            <div className="text-xs text-gray-400">Favorites</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Profile View - /dex/profile/[handle] or /dex/me */}
          {selectedView === 'profile' && (routeId || isExplicitOwnProfileRoute) && router.isReady && (
            <ProfileErrorBoundary>
            <div className="relative pb-32 overflow-y-auto min-h-screen" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Dynamic SEO for profile sharing - 8K quality avatar card */}
              {viewingProfile && (
                <Head>
                  <title>{viewingProfile.displayName || viewingProfile.userHandle} | SoundChain</title>
                  <meta name="description" content={viewingProfile.bio || `Check out ${viewingProfile.displayName || viewingProfile.userHandle} on SoundChain - Web3 Music Platform`} />

                  {/* OpenGraph for Facebook/LinkedIn */}
                  <meta property="og:title" content={`${viewingProfile.displayName || viewingProfile.userHandle} | SoundChain`} />
                  <meta property="og:description" content={viewingProfile.bio || `Join SoundChain to connect with ${viewingProfile.displayName || viewingProfile.userHandle}`} />
                  <meta property="og:image" content={viewingProfile.profilePicture || `${config.domainUrl}/soundchain-meta-logo.png`} />
                  <meta property="og:image:width" content="1200" />
                  <meta property="og:image:height" content="1200" />
                  <meta property="og:type" content="profile" />
                  <meta property="og:url" content={`${config.domainUrl}/dex/users/${viewingProfile.userHandle}`} />
                  <meta property="og:site_name" content="SoundChain" />

                  {/* Twitter Card - Large Image */}
                  <meta name="twitter:card" content="summary_large_image" />
                  <meta name="twitter:title" content={`${viewingProfile.displayName || viewingProfile.userHandle} | SoundChain`} />
                  <meta name="twitter:description" content={viewingProfile.bio || `Web3 Music Artist on SoundChain`} />
                  <meta name="twitter:image" content={viewingProfile.profilePicture || `${config.domainUrl}/soundchain-meta-logo.png`} />
                  <meta name="twitter:site" content="@SoundChainFM" />

                  {/* Canonical URL */}
                  <link rel="canonical" href={`${config.domainUrl}/dex/users/${viewingProfile.userHandle}`} />
                </Head>
              )}
              {viewingProfileLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-cyan-400">Loading profile...</span>
                </div>
              )}
              {viewingProfileError && (
                <Card className="retro-card p-6 text-center">
                  <p className="text-red-400 mb-2">Error loading profile</p>
                  <p className="text-gray-500 text-sm">{viewingProfileError.message}</p>
                </Card>
              )}
              {!viewingProfileLoading && !viewingProfileError && !viewingProfile && (
                <Card className="retro-card p-6 text-center">
                  <p className="text-yellow-400 mb-2">Profile not found</p>
                  <p className="text-gray-500 text-sm">The user "{routeId}" doesn't exist or may have been deleted.</p>
                  <Button variant="ghost" onClick={() => router.back()} className="mt-4 hover:bg-cyan-500/10">
                    <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                    Go Back
                  </Button>
                </Card>
              )}
              {viewingProfile && (
                <>
                  {/* Profile Header - Same layout as logged-in user */}
                  <div className="relative z-10 pt-8 pb-6">
                    <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
                      {/* Back Button */}
                      <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4 hover:bg-cyan-500/10"
                      >
                        <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                        Back
                      </Button>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        {/* User Profile */}
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                          <div className="relative">
                            <div className="w-40 lg:w-48 h-40 lg:h-48 rounded-3xl overflow-hidden analog-glow bg-gradient-to-br from-purple-900 to-cyan-900">
                              {viewingProfile.profilePicture ? (
                                <img
                                  src={viewingProfile.profilePicture}
                                  alt={viewingProfile.displayName || 'Profile'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-6xl text-white font-bold">
                                  {(viewingProfile.displayName || viewingProfile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full border-4 border-black/50 flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                            </div>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              {/* Username with inline badges */}
                              <div className="flex items-center gap-2">
                                <h1 className="text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: "'Space Mono', 'JetBrains Mono', monospace" }}>
                                  {viewingProfile.displayName || viewingProfile.userHandle || 'User'}
                                </h1>
                                {/* Team Member Badge */}
                                {viewingProfile.teamMember && (
                                  <SoundchainGoldLogo className="flex-shrink-0" style={{ width: '34px', height: '34px' }} aria-label="SoundChain Team Member" />
                                )}
                                {/* Verified Badge */}
                                {!viewingProfile.teamMember && viewingProfile.verified && (
                                  <VerifiedIcon className="flex-shrink-0" style={{ width: '34px', height: '34px' }} aria-label="Verified user" />
                                )}
                              </div>
                              <p className="retro-json text-sm">@{viewingProfile.userHandle || 'user'}</p>
                              <p className="text-gray-300 text-sm max-w-md">{viewingProfile.bio || ''}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="metadata-section p-4 text-center">
                                <div className="retro-text text-xl">{viewingProfileTrackCount}</div>
                                <div className="metadata-label text-xs">Tracks</div>
                              </div>
                              <div className="metadata-section p-4 text-center">
                                <div className="retro-text text-xl">{viewingProfile.followerCount?.toLocaleString() || 0}</div>
                                <div className="metadata-label text-xs">Followers</div>
                              </div>
                              <div className="metadata-section p-4 text-center">
                                <div className="retro-text text-xl">{viewingProfile.followingCount?.toLocaleString() || 0}</div>
                                <div className="metadata-label text-xs">Following</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {userLoading ? (
                                // Show loading state while auth is being determined
                                <Button className="retro-button opacity-50" disabled>
                                  <span className="w-4 h-4 mr-2 animate-pulse">•</span>
                                  Loading...
                                </Button>
                              ) : isViewingOwnProfile ? (
                                <Button className="retro-button" onClick={() => setSelectedView('settings')}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Edit Profile
                                </Button>
                              ) : (
                                <Button
                                  className={viewingProfile.isFollowed ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-red-500/20 text-cyan-300' : 'retro-button'}
                                  variant={viewingProfile.isFollowed ? 'outline' : 'default'}
                                  onClick={async () => {
                                    if (!me) {
                                      router.push('/login')
                                      return
                                    }
                                    if (viewingProfile.isFollowed) {
                                      await unfollowProfile({ variables: { input: { followedId: viewingProfile.id } } })
                                    } else {
                                      await followProfile({ variables: { input: { followedId: viewingProfile.id } } })
                                    }
                                  }}
                                >
                                  <Users className="w-4 h-4 mr-2" />
                                  {viewingProfile.isFollowed ? 'Following' : 'Follow'}
                                </Button>
                              )}
                              {!isViewingOwnProfile && (
                                <Button
                                  variant="outline"
                                  className="border-purple-500/50 hover:bg-purple-500/20"
                                  onClick={() => {
                                    if (!me) {
                                      router.push('/login')
                                      return
                                    }
                                    // Open DM modal instead of navigating
                                    setShowDMModal(true)
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />Message
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                className="border-cyan-500/50 hover:bg-cyan-500/20"
                                onClick={async () => {
                                  const profileUrl = `${window.location.origin}/profiles/${viewingProfile.userHandle}`
                                  const shareData = {
                                    title: `${viewingProfile.displayName || viewingProfile.userHandle} on SoundChain`,
                                    text: `Check out ${viewingProfile.displayName || viewingProfile.userHandle}'s profile on SoundChain - Music NFTs, streaming rewards & more!`,
                                    url: profileUrl
                                  }
                                  
                                  // Use native share if available (mobile)
                                  if (navigator.share && navigator.canShare?.(shareData)) {
                                    try {
                                      await navigator.share(shareData)
                                    } catch (err) {
                                      // User cancelled or share failed - fallback to copy
                                      if ((err as Error).name !== 'AbortError') {
                                        navigator.clipboard.writeText(profileUrl)
                                        toast.success('Profile link copied!')
                                      }
                                    }
                                  } else {
                                    // Desktop fallback - copy to clipboard
                                    navigator.clipboard.writeText(profileUrl)
                                    toast.success('Profile link copied! Share it on social media.')
                                  }
                                }}
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {viewingProfile.magicWalletAddress && (
                              <Card className="retro-card p-3 w-fit">
                                <div className="flex items-center gap-3">
                                  <Wallet className="w-4 h-4 text-orange-400" />
                                  <span className="retro-json text-sm">{viewingProfile.magicWalletAddress.slice(0, 6)}...{viewingProfile.magicWalletAddress.slice(-4)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(viewingProfile.magicWalletAddress || '')
                                      alert('Address copied!')
                                    }}
                                    className="p-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  {/* WIN-WIN Piggy Bank - Shows streaming rewards stats */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowWinWinStatsModal(true)}
                                    className="hover:bg-pink-500/20 p-1 group"
                                    title="WIN-WIN Streaming Rewards"
                                  >
                                    <PiggyBank className="w-4 h-4 text-pink-400 group-hover:text-pink-300 group-hover:scale-110 transition-all" />
                                  </Button>
                                </div>
                              </Card>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="relative z-10 max-w-screen-2xl mx-auto px-4 lg:px-6">
                    {/* Profile Tabs - Feed | Dashboard | Stake - Same as logged-in user */}
                    <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2">
                      <Button
                        variant="ghost"
                        onClick={() => setProfileTab('feed')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-green-500/10 ${profileTab === 'feed' ? 'bg-green-500/10' : ''}`}
                      >
                        <MessageCircle className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'feed' ? 'text-green-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'feed' ? 'green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                          Feed
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setProfileTab('music')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-purple-500/10 ${profileTab === 'music' ? 'bg-purple-500/10' : ''}`}
                      >
                        <Music className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'music' ? 'text-purple-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'music' ? 'purple-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                          Music
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setProfileTab('playlists')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-pink-500/10 ${profileTab === 'playlists' ? 'bg-pink-500/10' : ''}`}
                      >
                        <ListMusic className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'playlists' ? 'text-pink-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'playlists' ? 'pink-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                          Playlists
                        </span>
                      </Button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[400px]">
                      {profileTab === 'feed' && (
                        <Posts profileId={viewingProfile.id} disableVirtualization />
                      )}
                      {profileTab === 'music' && (
                        <TracksGrid profileId={viewingProfile.id} />
                      )}
                      {profileTab === 'playlists' && (
                        <div className="space-y-4">
                          {/* Playlists Section */}
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold">Playlists</h3>
                            {me?.profile?.id === viewingProfile.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCreatePlaylistModal(true)}
                                className="border-pink-500/50 hover:bg-pink-500/10 text-pink-400"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Playlist
                              </Button>
                            )}
                          </div>
                          {/* User playlists */}
                          {playlistsLoading ? (
                            <div className="flex justify-center py-8">
                              <RefreshCw className="w-6 h-6 animate-spin text-pink-400" />
                            </div>
                          ) : playlistsData?.getUserPlaylists?.nodes && playlistsData.getUserPlaylists.nodes.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {playlistsData.getUserPlaylists.nodes.map((playlist) => (
                                <PlaylistCard
                                  key={playlist.id}
                                  playlist={playlist}
                                  onClick={() => router.push(`/dex/playlist/${playlist.id}`)}
                                  compact
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-neutral-500">
                              <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p>No playlists yet</p>
                              {isViewingOwnProfile && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowCreatePlaylistModal(true)}
                                  className="mt-3 text-pink-400 hover:bg-pink-500/10"
                                >
                                  Create your first playlist
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </>
              )}
            </div>
            </ProfileErrorBoundary>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-cyan-500/30 bg-gray-900/80 py-6 mt-12">
          <div className="max-w-screen-2xl mx-auto px-4 text-center">
            <div className="retro-json text-sm mb-2">powered_by: "SoundChain × ZetaChain"</div>
            <div className="text-xs text-gray-500">DEX Dashboard • CarPlay Ready • Amazon Fire TV Ready • All Devices</div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} onConnect={handleWalletConnect} />

      {/* Top 100 NFTs Modal */}
      {showTop100Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95" onClick={() => setShowTop100Modal(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border-2 border-yellow-500 bg-gradient-to-br from-neutral-900 via-yellow-900/10 to-neutral-900 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-900 to-orange-900 px-4 py-3 flex items-center justify-between border-b border-yellow-500">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <div>
                  <span className="font-bold text-yellow-100 text-sm">Top 100 NFTs</span>
                  <p className="text-xs text-yellow-200/60">Most streamed NFT tracks</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTop100Modal(false)} className="w-8 h-8 p-0 text-yellow-300 hover:text-white hover:bg-yellow-500/20">
                <X className="w-5 h-5" />
              </Button>
            </div>
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
              {top100TracksLoading ? (
                <div className="py-8 text-center text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading Top 100...
                </div>
              ) : top100NftTracks.length === 0 ? (
                <div className="py-8 text-center text-gray-400">No NFT tracks found</div>
              ) : (
                <div className="space-y-2">
                  {top100NftTracks.map((track: any, index: number) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-yellow-500/10 transition-colors group cursor-pointer"
                      onClick={() => {
                        handlePlayTrack(track, index, top100NftTracks)
                        setShowTop100Modal(false)
                      }}
                    >
                      {/* Rank */}
                      <span className={`w-8 text-center font-bold text-sm ${
                        index === 0 ? 'text-yellow-400 text-lg' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-amber-600' :
                        'text-gray-500'
                      }`}>
                        #{index + 1}
                      </span>

                      {/* Artwork */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0 ring-2 ring-yellow-500/30">
                        <img
                          src={track.artworkUrl ?? '/images/default-artwork.png'}
                          alt={track.title ?? 'Track'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" fill="white" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-yellow-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-gray-500 text-xs truncate">{track.artist}</p>
                      </div>

                      {/* Play count */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-yellow-400 text-sm font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {track.playbackCountFormatted || '0'}
                        </span>
                        <span className="text-gray-500 text-xs">streams</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {connectedWallet && (
        <GuestPostModal
          isOpen={showGuestPostModal}
          onClose={() => setShowGuestPostModal(false)}
          walletAddress={connectedWallet}
        />
      )}
      <BackendPanel
        isOpen={showBackendPanel}
        onClose={() => setShowBackendPanel(false)}
        totalTracks={tracksData?.groupedTracks?.pageInfo?.totalCount}
        totalListings={listingData?.listingItems?.pageInfo?.totalCount}
      />

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAnnouncement(null)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-cyan-500/50 rounded-xl shadow-2xl shadow-cyan-500/20" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Hero Image */}
            {selectedAnnouncement.imageUrl && (
              <div className="relative w-full h-64 sm:h-80">
                <img
                  src={selectedAnnouncement.imageUrl}
                  alt={selectedAnnouncement.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
              </div>
            )}

            {/* Content */}
            <div className={`p-6 ${selectedAnnouncement.imageUrl ? '-mt-16 relative' : ''}`}>
              <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold mb-3">
                {selectedAnnouncement.type?.replace('_', ' ') || 'ANNOUNCEMENT'}
              </Badge>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{selectedAnnouncement.title}</h2>

              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-cyan-400">{selectedAnnouncement.companyName || 'SoundChain'}</span>
                  <p className="text-gray-500 text-sm">{new Date(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>

              {/* Tags */}
              {selectedAnnouncement.tags && selectedAnnouncement.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-gray-700">
                  {selectedAnnouncement.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                {selectedAnnouncement.link && (
                  <a
                    href={selectedAnnouncement.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Globe className="w-5 h-5" />
                    Visit Link
                  </a>
                )}
                <button
                  onClick={() => {
                    navigator.share?.({
                      title: selectedAnnouncement.title,
                      text: selectedAnnouncement.content?.substring(0, 100) + '...',
                      url: window.location.href,
                    }).catch(() => {})
                  }}
                  className="px-4 py-3 bg-gray-800 rounded-lg text-white font-semibold hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DM Modal for profile messaging - must be inside component for state access */}
      {viewingProfile && (
        <DMModal
          show={showDMModal}
          onClose={() => setShowDMModal(false)}
          recipientProfile={{
            id: viewingProfile.id,
            displayName: viewingProfile.displayName,
            userHandle: viewingProfile.userHandle,
            profilePicture: viewingProfile.profilePicture,
          }}
        />
      )}
    </div>
    </>
  )
}

// Custom layout to bypass the default Layout component (avoids double nav bar)
// IMPORTANT: Must include all providers that _app.tsx has for GraphQL/state to work
DEXDashboard.getLayout = (page: ReactElement) => {
  return (
    <ModalProvider>
      <StateProvider>
        <HideBottomNavBarProvider>
          <LayoutContextProvider>
            <AudioPlayerProvider>
              <TrackProvider>
                {page}
                <AudioEngine />
                <MobileBottomAudioPlayer />
                <DesktopBottomAudioPlayer />
                <ToastContainer
                  position="top-center"
                  autoClose={6 * 1000}
                  toastStyle={{
                    backgroundColor: '#202020',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center',
                  }}
                />
                {/* Portal container for modals - required for Posts video/music embed modals */}
                <div id="modals">
                  {/* NFT Minting Modal */}
                  <CreateModal />
                  {/* Post Creation Modal */}
                  <PostModal />
                  {/* Post Actions (edit/delete) Modal */}
                  <AuthorActionsModal />
                  {/* Comment Modal */}
                  <CommentModal />
                  {/* Audio Player Fullscreen Modal */}
                  <AudioPlayerModal />
                </div>
              </TrackProvider>
            </AudioPlayerProvider>
          </LayoutContextProvider>
        </HideBottomNavBarProvider>
      </StateProvider>
    </ModalProvider>
  )
}

// Server-side props for OG meta tags (social sharing previews)
// Fetches track/profile data so crawlers see rich preview cards
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Default empty OG data - page will still load even if data fetch fails
  const emptyOgData = { type: null as 'track' | 'profile' | 'playlist' | null }

  // Detect social media crawlers/bots for SSR-only rendering
  const userAgent = context.req.headers['user-agent'] || ''
  const botPatterns = [
    'Discordbot',           // Discord
    'Twitterbot',           // Twitter/X
    'facebookexternalhit',  // Facebook
    'LinkedInBot',          // LinkedIn
    'Slackbot',             // Slack
    'TelegramBot',          // Telegram
    'WhatsApp',             // WhatsApp
    'Googlebot',            // Google
    'bingbot',              // Bing
    'Applebot',             // Apple/iMessage
  ]
  const isBot = botPatterns.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))

  try {
    const slug = context.params?.slug as string[] | undefined
    const routeType = slug?.[0]
    const routeId = slug?.[1]

    // Only fetch OG data for track, profile, and playlist pages
    if (!routeType || !routeId || (routeType !== 'track' && routeType !== 'users' && routeType !== 'playlist')) {
      return { props: { ogData: emptyOgData, isBot } }
    }

    // Dynamic imports to avoid loading heavy modules for non-OG routes
    const [{ createApolloClient }, graphql] = await Promise.all([
      import('lib/apollo'),
      import('lib/graphql'),
    ])

    const apolloClient = createApolloClient(context)

    // Track page: /dex/track/[id]
    if (routeType === 'track') {
      try {
        const { data } = await apolloClient.query({
          query: graphql.TrackDocument,
          variables: { id: routeId },
          errorPolicy: 'all', // Don't throw on GraphQL errors
        })

        if (data?.track) {
          const domainUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://www.soundchain.io'
          const fallbackImage = `${domainUrl}/soundchain-meta-logo.png`
          // Ensure artwork URL is absolute for social media crawlers
          let ogImage = data.track.artworkUrl || fallbackImage
          if (ogImage && !ogImage.startsWith('http')) {
            ogImage = `${domainUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
          }
          return {
            props: {
              ogData: {
                type: 'track' as const,
                title: `${data.track.title || 'Track'} by ${data.track.artist || 'Unknown'} | SoundChain`,
                description: `Listen to "${data.track.title}" by ${data.track.artist} on SoundChain. ${data.track.playbackCountFormatted || '0'} plays.`,
                image: ogImage,
                url: `/dex/track/${routeId}`,
              },
              isBot,
            },
          }
        }
      } catch (trackError) {
        console.error('Track OG fetch error:', trackError)
      }
    }

    // Profile page: /dex/users/[handle]
    if (routeType === 'users') {
      try {
        const { data } = await apolloClient.query({
          query: graphql.ProfileByHandleDocument,
          variables: { handle: routeId },
          errorPolicy: 'all',
        })

        if (data?.profileByHandle) {
          const profile = data.profileByHandle
          const domainUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://www.soundchain.io'
          const fallbackImage = `${domainUrl}/soundchain-meta-logo.png`
          // Ensure profile image URL is absolute for social media crawlers
          let ogImage = profile.profilePicture || profile.coverPicture || fallbackImage
          if (ogImage && !ogImage.startsWith('http')) {
            ogImage = `${domainUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
          }
          return {
            props: {
              ogData: {
                type: 'profile' as const,
                title: `${profile.displayName || profile.userHandle} | SoundChain`,
                description: profile.bio || `Follow ${profile.displayName || profile.userHandle} on SoundChain - Web3 Music Platform`,
                image: ogImage,
                url: `/dex/users/${routeId}`,
              },
              isBot,
            },
          }
        }
      } catch (profileError) {
        console.error('Profile OG fetch error:', profileError)
      }
    }

    // Playlist page: /dex/playlist/[id]
    if (routeType === 'playlist') {
      try {
        const { data } = await apolloClient.query({
          query: graphql.PlaylistDocument,
          variables: { id: routeId },
          errorPolicy: 'all',
        })

        if (data?.playlist) {
          const playlist = data.playlist
          const domainUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://www.soundchain.io'
          const fallbackImage = `${domainUrl}/soundchain-meta-logo.png`
          // Ensure playlist artwork URL is absolute for social media crawlers
          let ogImage = playlist.artworkUrl || fallbackImage
          if (ogImage && !ogImage.startsWith('http')) {
            ogImage = `${domainUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
          }
          return {
            props: {
              ogData: {
                type: 'playlist' as const,
                title: `${playlist.title} | SoundChain Playlist`,
                description: playlist.description || `Listen to this playlist on SoundChain - Web3 Music Platform. ${playlist.favoriteCount || 0} likes.`,
                image: ogImage,
                url: `/dex/playlist/${routeId}`,
              },
              isBot,
            },
          }
        }
      } catch (playlistError) {
        console.error('Playlist OG fetch error:', playlistError)
      }
    }
  } catch (error) {
    console.error('SSR getServerSideProps error:', error)
  }

  // Return empty OG data if anything fails - page still loads
  return { props: { ogData: emptyOgData, isBot } }
}

export default DEXDashboard
