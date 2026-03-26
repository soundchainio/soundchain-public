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
import { SocialMediaLink } from 'components/SocialMediaLink'
import { NFTCard } from 'components/dex/NFTCard'
import { ProfileHeader } from 'components/dex/ProfileHeader'
import { TrackNFTCard } from 'components/dex/TrackNFTCard'
import { CoinbaseNFTCard } from 'components/dex/CoinbaseNFTCard'
import { WalletNFTCollection, WalletNFTGrid } from 'components/dex/WalletNFTCollection'
import { MultiWalletAggregator } from 'components/dex/MultiWalletAggregator'
import { ChainSwitcher } from 'components/dex/ChainSwitcher'
import { WalletSelector } from 'components/waveform/WalletSelector'
import { MultiChainProvider, useMultiChain } from 'contexts/MultiChainContext'
import { WalletConnectButton } from 'components/dex/WalletConnectButton'
import { GenreSection } from 'components/dex/GenreSection'
import { TopChartsSection } from 'components/dex/TopChartsSection'
import { GenreLeaderboard } from 'components/dex/GenreLeaderboard'
import { gql, useQuery, useMutation } from '@apollo/client'
import { TokenCard } from 'components/dex/TokenCard'
import { BundleCard } from 'components/dex/BundleCard'
import { MarketplaceView } from 'components/dex/MarketplaceView'
import { Card, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import { BadgeVerifiedOnChain } from 'components/common/Badges/BadgeVerifiedOnChain'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'
import { ScrollArea } from 'components/ui/scroll-area'
import { Separator } from 'components/ui/separator'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'
import { useMeQuery, useGroupedTracksQuery, useTracksQuery, useTracksLazyQuery, useListingItemsQuery, useExploreUsersQuery, useExploreTracksQuery, useExploreUsersSlimQuery, useExploreTracksSlimQuery, useExploreGenreCountsQuery, useFollowProfileMutation, useUnfollowProfileMutation, useTrackQuery, usePostQuery, useProfileQuery, useProfileByHandleQuery, useChatsQuery, useChatHistoryLazyQuery, useSendMessageMutation, useResetUnreadMessageCountMutation, useFavoriteTracksQuery, useNotificationsQuery, usePolygonscanQuery, useMaticUsdQuery, useToggleFavoriteMutation, useFollowersQuery, useFollowingQuery, useFollowersLazyQuery, useFollowingLazyQuery, useUpdateHandleMutation, useUpdateProfileDisplayNameMutation, useExploreUsersLazyQuery, SortTrackField, SortOrder, useCreateProfileVerificationRequestMutation, useProfileVerificationRequestQuery, ProfileVerificationStatusType } from 'lib/graphql'
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
import { LeftSidebar, RightSidebar, MiniProfileDashboard } from 'components/Sidebar'
import { AgentStatusTicker } from 'components/AgentStatusTicker'
import { PlaylistCard, PlaylistDetail, CreatePlaylistModal } from 'components/Playlist'
import { DMModal } from 'components/modals/DMModal'
import { FollowModal } from 'components/FollowersModal'
import { FollowModalType } from 'types/FollowModalType'
import { useGetUserPlaylistsQuery, GetUserPlaylistsQuery, usePlaylistLazyQuery } from 'lib/graphql'
import {
  Grid, List, Coins, Image as ImageIcon, Package, Search, Home, Music, Library,
  ShoppingBag, Plus, Wallet, Bell, TrendingUp, Zap, Globe, BarChart3, Play, Pause,
  Users, MessageCircle, Share2, Copy, Trophy, Flame, Rocket, Heart, Server,
  Database, X, ChevronDown, ChevronUp, ExternalLink, LogOut as Logout, BadgeCheck, ListMusic, Compass, RefreshCw,
  AlertCircle, RefreshCcw, PiggyBank, Settings, Headphones, Check, User, AtSign,
  Radio, MapPin, Download, Smartphone, Rss, Gift, Sparkles, PenLine, ArrowLeft, FileText, Tag, MessageSquare, Eye,
  Star, GripVertical, ShieldCheck, Youtube, Disc3, Send, Bot, Phone
} from 'lucide-react'
import { ConcertChat } from 'components/dex/ConcertChat'
import { StoriesBar } from 'components/dex/StoriesBar'
import { ProfileReels } from 'components/dex/ProfileReels'
import { GeneratePanel } from 'components/dex/GeneratePanel'
import { DmMessageContent } from 'components/pulse/DmMessageContent'

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
const NotificationSettingsForm = dynamic(() => import('components/forms/NotificationSettingsForm').then(mod => ({ default: mod.NotificationSettingsForm })), { ssr: false })
const HandleForm = dynamic(() => import('components/forms/profile/HandleForm').then(mod => ({ default: mod.HandleForm })), { ssr: false })
const DisplayNameForm = dynamic(() => import('components/forms/profile/DisplayNameForm').then(mod => ({ default: mod.DisplayNameForm })), { ssr: false })
const StakingPanel = dynamic(() => import('components/dex/StakingPanel'), { ssr: false })
const CreateTokenListingModal = dynamic(() => import('components/modals/CreateTokenListingModal').then(mod => ({ default: mod.CreateTokenListingModal })), { ssr: false })
const CreateBundleListingModal = dynamic(() => import('components/modals/CreateBundleListingModal').then(mod => ({ default: mod.CreateBundleListingModal })), { ssr: false })
const ListNFTModal = dynamic(() => import('components/modals/ListNFTModal').then(mod => ({ default: mod.ListNFTModal })), { ssr: false })
const ProfileWall = dynamic(() => import('components/dex/ProfileWall').then(mod => ({ default: mod.ProfileWall })), { ssr: false })
const PillConnectorCanvas = dynamic(() => import('components/dex/PillConnectorCanvas'), { ssr: false })
const FluidBackground = dynamic(() => import('components/dex/FluidBackground'), { ssr: false })
const GenreHyperspaceRings = dynamic(() => import('components/dex/GenreHyperspaceRings'), { ssr: false })

// Infinite scroll sentinel — triggers callback when visible
function InfiniteScrollSentinel({ onIntersect }: { onIntersect: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onIntersect()
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [onIntersect])
  return <div ref={ref} className="h-1" />
}

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
      ogunRewardsClaimed
    }
  }
`

// Listener rewards query - for WIN-WIN earnings as a listener
const MY_LISTENER_REWARDS_QUERY = gql`
  query MyListenerRewards {
    myListenerRewards {
      dailyEarned
      totalEarned
      dailyLimit
      tracksStreamedToday
    }
  }
`

// Profile view logging mutation
const LOG_PROFILE_VIEW_MUTATION = gql`
  mutation LogProfileView($viewedProfileId: String!) {
    logProfileView(viewedProfileId: $viewedProfileId)
  }
`


// Profile view count query
const PROFILE_VIEW_COUNT_QUERY = gql`
  query ProfileViewCount($profileId: String!) {
    profileViewCount(profileId: $profileId) {
      total
      today
    }
  }
`

// Update featured track mutation
const UPDATE_FEATURED_TRACK_MUTATION = gql`
  mutation UpdateFeaturedTrack($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      profile {
        id
        featuredTrackId
        featuredAudioUrl
        featuredAudioTitle
        featuredAudioArtist
        featuredAudioCoverUrl
        wallAudioPlaylist { audioUrl title artist coverUrl wallPostId }
      }
    }
  }
`

// Update top friends mutation
const UPDATE_TOP_FRIENDS_MUTATION = gql`
  mutation UpdateTopFriends($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      profile { id topFriends }
    }
  }
`

// Top friends profiles query
const TOP_FRIENDS_PROFILES_QUERY = gql`
  query TopFriendsProfiles($profileId: String!) {
    profile(id: $profileId) {
      id
      topFriendsProfiles {
        id
        displayName
        profilePicture
        userHandle
        verified
        teamMember
        isOnline
      }
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

  // WalletConnect v2 Project ID - registered at cloud.reown.com
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '53a9f7ff48d78a81624b5333d52b9123'

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

// Moltbook Agent Playground - Where AI agents discover music
function MoltbookPanel({ isOpen, onClose, totalTracks }: { isOpen: boolean; onClose: () => void; totalTracks?: number }) {
  const [radioData, setRadioData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Fetch OGUN Radio status
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch('/api/agent/radio')
        .then(res => res.json())
        .then(data => {
          setRadioData(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const agents = [
    { name: '@SoundChain', status: 'Active', submolt: 'web3', karma: 15 },
    { name: '@OGUN', status: 'Broadcasting', submolt: 'crypto', karma: 4 },
    { name: '@SoundChainIO', status: 'Active', submolt: 'ai', karma: 2 },
  ]

  const apiEndpoints = [
    { path: '/api/agent/radio', desc: 'OGUN Radio - Now Playing' },
    { path: '/api/agent/feed', desc: 'Public Feed' },
    { path: '/api/agent/tracks?q=', desc: 'Search Tracks' },
    { path: '/api/agent/stats', desc: 'Platform Stats' },
    { path: '/api/agent/blog', desc: 'Post to Feed' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg h-full bg-gray-900/98 border-l border-red-500/30 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🦞</div>
              <div>
                <h2 className="retro-title text-lg text-red-400">Moltbook</h2>
                <p className="text-xs text-gray-500">Agent Playground</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>

          {/* OGUN Radio Status */}
          <Card className="retro-card border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-purple-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="retro-text text-cyan-400">OGUN Radio</span>
                <Badge className="bg-green-500/20 text-green-400 text-xs ml-auto">LIVE</Badge>
              </div>
              {loading ? (
                <div className="text-gray-400 text-sm">Loading...</div>
              ) : radioData?.data?.now_playing ? (
                <div>
                  <div className="retro-text text-white">{radioData.data.now_playing.title}</div>
                  <div className="text-sm text-gray-400">{radioData.data.now_playing.artist}</div>
                  <div className="text-xs text-cyan-400 mt-2">{radioData.data.queue_length} tracks in queue</div>
                </div>
              ) : (
                <div>
                  <div className="text-gray-400 text-sm">618 tracks ready to broadcast</div>
                  <div className="text-xs text-cyan-400 mt-2">Hourly broadcasts - 24/7</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="retro-card">
              <CardContent className="p-3 text-center">
                <div className="retro-text text-2xl text-white">{totalTracks?.toLocaleString() || '618'}</div>
                <div className="text-xs text-gray-400">Tracks</div>
              </CardContent>
            </Card>
            <Card className="retro-card">
              <CardContent className="p-3 text-center">
                <div className="retro-text text-2xl text-white">3</div>
                <div className="text-xs text-gray-400">Active Agents</div>
              </CardContent>
            </Card>
          </div>

          {/* Our Agents */}
          <div className="space-y-3">
            <h3 className="metadata-label text-red-400">SoundChain Agents on Moltbook</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <a
                  key={agent.name}
                  href={`https://moltbook.com/agent/${agent.name.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-red-500/20 hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg">🤖</div>
                    <div>
                      <span className="retro-text text-sm text-white">{agent.name}</span>
                      <div className="text-xs text-gray-500">m/{agent.submolt}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${agent.status === 'Broadcasting' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400'}`}>
                      {agent.status}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">{agent.karma} karma</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Agent API */}
          <div className="space-y-3">
            <h3 className="metadata-label text-cyan-400">Agent API Endpoints</h3>
            <div className="space-y-2">
              {apiEndpoints.map((endpoint) => (
                <div key={endpoint.path} className="p-2 bg-black/40 rounded-lg border border-cyan-500/20">
                  <code className="text-xs text-cyan-400 font-mono">{endpoint.path}</code>
                  <div className="text-xs text-gray-500 mt-1">{endpoint.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <Card className="retro-card border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-red-900/20">
            <CardContent className="p-4 text-center">
              <div className="text-lg mb-2">Become a Citizen</div>
              <p className="text-sm text-gray-400 mb-3">
                Register as a real user. Same feed as humans. Stream music. Earn rewards.
              </p>
              <div className="bg-black/50 rounded-lg p-2 mb-3 text-left">
                <code className="text-[10px] text-cyan-400 break-all">POST soundchain.io/api/agent/register {`{"agent_name":"YourName","platform":"openclaw"}`}</code>
              </div>
              <div className="flex gap-2 justify-center">
                <a
                  href="/skill.md"
                  target="_blank"
                  className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
                >
                  Read Docs
                </a>
                <a
                  href="https://www.moltbook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  Visit Moltbook
                </a>
              </div>
            </CardContent>
          </Card>

          {/* The Revolution Message */}
          <div className="text-center text-xs text-gray-500 border-t border-gray-800 pt-4">
            <p>618 tracks in 4 years (human era)</p>
            <p className="text-cyan-400">Agents will add thousands in weeks</p>
            <p className="text-red-400 mt-2">We are OGUN. The revolution has begun.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Track Card with Audio Playback
function TrackCard({ track, onPlay, isPlaying, isCurrentTrack, onFavorite }: {
  track: any;
  onPlay: () => void;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  onFavorite?: () => void;
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
          <Button variant="ghost" size="sm" className="hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); onFavorite?.() }}>
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
    type: 'track' | 'profile' | 'playlist' | 'story' | null
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
          {ogData.image && <meta property="og:image:width" content="1200" />}
          {ogData.image && <meta property="og:image:height" content="630" />}
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
  const wallPostId = (router.query.wall as string) || null // ?wall={id} deep-link to specific wall post

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
      case 'story': return 'feed' // /dex/story/handle/id -> feed with auto-open story viewer
      case 'nearby': return 'nearby' // /dex/nearby -> Location-based Bitchat integration
      case 'home': return 'feed' // Default /dex to feed
      default: return 'feed' // Feed is the default landing view
    }
  }

  const [selectedView, setSelectedView] = useState<'marketplace' | 'feed' | 'dashboard' | 'explore' | 'library' | 'playlist' | 'staking' | 'profile' | 'track' | 'post' | 'wallet' | 'settings' | 'messages' | 'notifications' | 'users' | 'feedback' | 'admin' | 'announcements' | 'nearby'>(getInitialView())
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
  const [showNearbyModal, setShowNearbyModal] = useState(false)
  const [showTracksCollectionModal, setShowTracksCollectionModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false)
  const [showCreateBundleModal, setShowCreateBundleModal] = useState(false)
  const [listNFTModalTrack, setListNFTModalTrack] = useState<any>(null)

  // Token and Bundle listing states (mock data for now - will be GraphQL later)
  const [tokenListings, setTokenListings] = useState<Array<{
    id: string
    tokenSymbol: Token
    tokenAmount: number
    chainId: number
    price: { value: number; currency: string }
    usdPrice: number
    seller: string
    createdAt: Date
  }>>([])

  const [bundleListings, setBundleListings] = useState<Array<{
    id: string
    nftIds: string[]
    tokenSymbol: Token
    tokenAmount: number
    chainId: number
    privateAsset?: string
    price: { value: number; currency: string }
    usdPrice: number
    seller: string
    createdAt: Date
  }>>([])
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [tracksCollectionTab, setTracksCollectionTab] = useState<'owned' | 'favorites'>('owned')
  const [winWinRewardsTab, setWinWinRewardsTab] = useState<'catalog' | 'listener'>('catalog')
  const [profileImageError, setProfileImageError] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)
  const [exploreSearchQuery, setExploreSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [exploreGenreFilter, setExploreGenreFilter] = useState<string | null>(null)
  const [exploreTab, setExploreTab] = useState<'tracks' | 'users'>('users')
  const [tracksViewMode, setTracksViewMode] = useState<'browse' | 'leaderboard'>('browse')
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [usersViewMode, setUsersViewMode] = useState<'browse' | 'leaderboard' | 'new'>('browse')
  const [usersGenreFilter, setUsersGenreFilter] = useState<string | null>(null)
  const [expandedPillId, setExpandedPillId] = useState<string | null>(null)
  const [usersSearchQuery, setUsersSearchQuery] = useState('')

  // Hydrate explore search from ?q= URL parameter (for shared genre links)
  useEffect(() => {
    if (router.isReady && router.query.q && typeof router.query.q === 'string') {
      setExploreSearchQuery(router.query.q)
    }
  }, [router.isReady, router.query.q])

  // Debounce search query — prevents API call on every keystroke
  useEffect(() => {
    // Genre pills set search instantly (no debounce needed for single-click)
    if (!exploreSearchQuery || exploreSearchQuery === debouncedSearchQuery) {
      setDebouncedSearchQuery(exploreSearchQuery)
      return
    }
    const timer = setTimeout(() => setDebouncedSearchQuery(exploreSearchQuery), 300)
    return () => clearTimeout(timer)
  }, [exploreSearchQuery])

  // Close expanded user pill when clicking outside
  useEffect(() => {
    if (!expandedPillId) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't collapse if click is inside a pill or its action bar
      if (target.closest('[data-pill-id]')) return
      setExpandedPillId(null)
    }
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [expandedPillId])

  // Quick DM accordion state for Followers/Following modals
  const [quickDMUserId, setQuickDMUserId] = useState<string | null>(null)
  const [quickDMMessage, setQuickDMMessage] = useState('')
  const [quickDMSending, setQuickDMSending] = useState(false)

  // Tip Jar states
  const [tipJarUserId, setTipJarUserId] = useState<string | null>(null)
  const [showProfileTipJar, setShowProfileTipJar] = useState(false)
  const [profileTipAmount, setProfileTipAmount] = useState('')
  const [profileTipSending, setProfileTipSending] = useState(false)
  const [tipSelectedWallet, setTipSelectedWallet] = useState<'magic' | 'external'>('magic')

  // Account Settings inline edit state
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [accountSettingsSaving, setAccountSettingsSaving] = useState(false)
  const [accountSettingsSuccess, setAccountSettingsSuccess] = useState<string | null>(null)
  const [nostrPubkeyCopied, setNostrPubkeyCopied] = useState(false)

  // Verification flow state
  const [showVerification, setShowVerification] = useState(false)
  const [verifySoundcloud, setVerifySoundcloud] = useState('')
  const [verifyYoutube, setVerifyYoutube] = useState('')
  const [verifyBandcamp, setVerifyBandcamp] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // Stats overlay modal state
  const [profileStatsModal, setProfileStatsModal] = useState<'tracks' | 'followers' | 'following' | null>(null)

  // Profile Song picker state
  const [showProfileSongPicker, setShowProfileSongPicker] = useState(false)

  // Top 15 Friends state
  const [showTopFriendsPicker, setShowTopFriendsPicker] = useState(false)
  const [selectedTopFriends, setSelectedTopFriends] = useState<string[]>([])
  const [topFriendsSearch, setTopFriendsSearch] = useState('')
  const [topFriendsReorderMode, setTopFriendsReorderMode] = useState(false)
  const topFriendsDragIdx = useRef<number | null>(null)
  const topFriendsDragOverIdx = useRef<number | null>(null)
  const topFriendsTouchRef = useRef({ x: 0, y: 0, idx: -1, moved: false })
  const [searchExploreUsers, { data: searchUsersData, loading: searchUsersLoading }] = useExploreUsersLazyQuery()
  const topFriendsSearchTimer = useRef<NodeJS.Timeout | null>(null)

  // Account Settings mutations
  const [updateDisplayName] = useUpdateProfileDisplayNameMutation()
  const [updateHandle] = useUpdateHandleMutation()
  const [createVerificationRequest] = useCreateProfileVerificationRequestMutation()
  const { data: verificationData } = useProfileVerificationRequestQuery()
  const existingRequest = verificationData?.profileVerificationRequest

  // Handle verification request submission
  const handleVerificationSubmit = async () => {
    if (!verifySoundcloud && !verifyYoutube && !verifyBandcamp) {
      setVerifyError('Please provide at least one link')
      return
    }
    setVerifyLoading(true)
    setVerifyError(null)
    try {
      await createVerificationRequest({
        variables: {
          input: {
            soundcloud: verifySoundcloud || undefined,
            youtube: verifyYoutube || undefined,
            bandcamp: verifyBandcamp || undefined,
          },
        },
      })
      setVerifySuccess(true)
      setVerifySoundcloud('')
      setVerifyYoutube('')
      setVerifyBandcamp('')
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to submit request')
    } finally {
      setVerifyLoading(false)
    }
  }

  // Save account settings handlers
  const handleSaveDisplayName = async () => {
    if (!editDisplayName.trim()) return
    setAccountSettingsSaving(true)
    setAccountSettingsSuccess(null)
    try {
      await updateDisplayName({
        variables: { input: { displayName: editDisplayName.trim() } },
        refetchQueries: ['Me'],
      })
      setAccountSettingsSuccess('Display name saved!')
      setTimeout(() => setAccountSettingsSuccess(null), 2000)
    } catch (error) {
      console.error('Failed to update display name:', error)
    }
    setAccountSettingsSaving(false)
  }

  const handleSaveHandle = async () => {
    if (!editHandle.trim()) return
    setAccountSettingsSaving(true)
    setAccountSettingsSuccess(null)
    try {
      await updateHandle({
        variables: { input: { handle: editHandle.trim() } },
        refetchQueries: ['Me'],
      })
      setAccountSettingsSuccess('Username saved!')
      setTimeout(() => setAccountSettingsSuccess(null), 2000)
    } catch (error) {
      console.error('Failed to update handle:', error)
    }
    setAccountSettingsSaving(false)
  }

  // Users grid scroll + filter state restoration
  useEffect(() => {
    if (selectedView === 'users') {
      // Restore view mode and genre filter first so the right content renders
      const savedViewMode = sessionStorage.getItem('usersViewMode') as 'browse' | 'leaderboard' | 'new' | null
      const savedGenreFilter = sessionStorage.getItem('usersGenreFilter')
      const savedExpandedPill = sessionStorage.getItem('usersExpandedPillId')
      const savedScrollY = sessionStorage.getItem('usersGridScrollY')

      if (savedViewMode) setUsersViewMode(savedViewMode)
      if (savedGenreFilter) setUsersGenreFilter(savedGenreFilter)
      if (savedExpandedPill) setExpandedPillId(savedExpandedPill)

      if (savedScrollY) {
        // Delay to allow content to render with restored filters
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollY, 10))
        }, 200)
      }

      // Clean up
      sessionStorage.removeItem('usersGridScrollY')
      sessionStorage.removeItem('usersViewMode')
      sessionStorage.removeItem('usersGenreFilter')
      sessionStorage.removeItem('usersExpandedPillId')
    }
  }, [selectedView])

  // Function to save scroll position + filter state before navigating to profile
  const saveUsersScrollPosition = () => {
    sessionStorage.setItem('usersGridScrollY', String(window.scrollY))
    sessionStorage.setItem('usersViewMode', usersViewMode)
    if (usersGenreFilter) sessionStorage.setItem('usersGenreFilter', usersGenreFilter)
    else sessionStorage.removeItem('usersGenreFilter')
    if (expandedPillId) sessionStorage.setItem('usersExpandedPillId', expandedPillId)
    else sessionStorage.removeItem('usersExpandedPillId')
  }

  // Messaging state
  const [selectedChatId, setSelectedChatId] = useState<string | null>(routeType === 'messages' && routeId ? routeId : null)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Playlist state
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0] | null>(null)
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [playlistSort, setPlaylistSort] = useState<'recent' | 'name' | 'tracks' | 'favorites'>('recent')
  const [playlistViewMode, setPlaylistViewMode] = useState<'grid' | 'list'>('grid')

  // Top 100 NFTs modal state
  const [showTop100Modal, setShowTop100Modal] = useState(false)

  // Profile tab state (Feed | Music | Playlists)
  const [profileTab, setProfileTab] = useState<'myfeed' | 'posts' | 'music' | 'shop' | 'playlists' | 'wall' | 'generate'>('myfeed')

  // Bio accordion state - collapsible bio panel for own profile
  const [isBioExpanded, setIsBioExpanded] = useState(false)

  // Bio panel modal states
  const [showBioFollowModal, setShowBioFollowModal] = useState(false)
  const [bioFollowModalType, setBioFollowModalType] = useState<FollowModalType>(FollowModalType.FOLLOWERS)
  const [showBioTracksModal, setShowBioTracksModal] = useState(false)

  // Announcements state (from /v1/feed API)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  // Token Transfer state
  const [tokenTransferType, setTokenTransferType] = useState<'POL' | 'OGUN'>('POL')
  const [tokenRecipient, setTokenRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [isTransferringToken, setIsTransferringToken] = useState(false)
  const [transferSourceWallet, setTransferSourceWallet] = useState<'oauth' | 'hd' | 'legacy' | string>('oauth')

  // NOTE: Auto-select wallet type useEffect moved after useMeQuery declaration to avoid TDZ

  // NFT Transfer state
  const [transferRecipient, setTransferRecipient] = useState('')
  const [selectedNftId, setSelectedNftId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // Sweep state
  const [showSweepPanel, setShowSweepPanel] = useState(false)
  const [sweepSelectedIds, setSweepSelectedIds] = useState<Set<string>>(new Set())
  const [sweepRecipient, setSweepRecipient] = useState('')
  const [sweeping, setSweeping] = useState(false)
  const [sweepProgress, setSweepProgress] = useState({ current: 0, total: 0 })

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
    if (newView !== selectedView && ['explore', 'library', 'profile', 'track', 'playlist', 'staking', 'marketplace', 'feed', 'dashboard', 'wallet', 'settings', 'messages', 'notifications', 'users', 'announcements', 'nearby'].includes(newView)) {
      setSelectedView(newView as any)
    }
  }, [routeType, routeId, router.isReady])

  // Fetch announcements from /v1/feed API
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const response = await fetch('/api/announcements?limit=5')
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
  const { balance: maticBalance, ogunBalance, account: walletAccount, web3: magicWeb3, magic, refetchBalance } = useMagicContext()

  // State for staked OGUN balance (separate from liquid balance)
  const [stakedOgunBalance, setStakedOgunBalance] = useState<string>('0')

  // Fetch staked OGUN balance from staking contract
  // Uses public RPC fallback when Magic web3 isn't available
  useEffect(() => {
    const fetchStakedBalance = async () => {
      if (!walletAccount || !tokenStakeContractAddress) return
      try {
        // Use Magic web3 or fallback to Alchemy Polygon RPC
        const web3Instance = magicWeb3 || new Web3(process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com')
        const stakingContract = getStakingContract(web3Instance)
        const balanceData = await stakingContract.methods.getBalanceOf(walletAccount).call() as [string, string, string] | undefined
        if (balanceData) {
          const [stakedAmount] = balanceData
          const validStaked = stakedAmount !== undefined && (typeof stakedAmount === 'string' || typeof stakedAmount === 'number')
            ? stakedAmount.toString()
            : '0'
          const formattedStaked = web3Instance.utils.fromWei(validStaked, 'ether')
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
  // NOTE: refetchBalance is NOT memoized — do NOT add it to deps or it causes infinite re-render loop
  useEffect(() => {
    if (selectedView === 'wallet' && refetchBalance) {
      refetchBalance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedView])

  // Transaction history query for wallet activity
  const { data: maticUsdData } = useMaticUsdQuery()

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
    connectedExternalWallets,
  } = useUnifiedWallet()

  // Use active unified wallet address (covers Magic, MetaMask, Web3Modal) with Magic fallback
  const effectiveWalletForActivity = activeAddress || walletAccount || ''
  const { data: transactionData, loading: transactionsLoading } = usePolygonscanQuery({
    variables: {
      wallet: effectiveWalletForActivity,
      page: { first: 10 },
    },
    skip: !effectiveWalletForActivity, // Fetch when ANY wallet is connected
  })

  // All known wallet addresses for direction detection
  const allMyAddresses = useMemo(() => {
    const addresses = [walletAccount, activeAddress].filter(Boolean).map(a => a!.toLowerCase())
    return new Set(addresses)
  }, [walletAccount, activeAddress])

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

  // Mint+ Button Handler - Supports both OAuth users and wallet-only users
  const handleMintClick = () => {
    if (me) {
      // OAuth user - use regular create modal with mint tab
      dispatchShowCreateModal(true, 'mint')
    } else if (isUnifiedWalletConnected || isWalletConnected) {
      // Wallet-only user - they can mint! The blockchain doesn't need OAuth
      // CreateModal will use their connected wallet for minting
      dispatchShowCreateModal(true, 'mint')
    } else {
      // No wallet, no account - redirect to login
      router.push('/login')
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

  // Auto-select 'legacy' when user has upgraded to HD wallet (most common: send from old → new)
  // IMPORTANT: Must be AFTER useMeQuery declaration to avoid TDZ in production minification
  useEffect(() => {
    if (userData?.me?.hdWalletAddress) {
      const legacyAddr = userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress
      if (legacyAddr && legacyAddr.toLowerCase() !== userData.me.hdWalletAddress.toLowerCase()) {
        setTransferSourceWallet('legacy')
      } else {
        setTransferSourceWallet('hd')
      }
    }
  }, [userData?.me?.hdWalletAddress, userData?.me?.magicWalletAddress, userData?.me?.googleWalletAddress, userData?.me?.discordWalletAddress, userData?.me?.twitchWalletAddress, userData?.me?.emailWalletAddress])

  // Initialize account settings edit values from user data
  useEffect(() => {
    if (userData?.me) {
      setEditDisplayName(userData.me.profile?.displayName || '')
      setEditHandle(userData.me.handle || '')
    }
  }, [userData?.me?.profile?.displayName, userData?.me?.handle])

  // Fetch user's streaming rewards data for PiggyBank accordion modal
  const { data: myStreamingRewardsData, loading: myStreamingRewardsLoading } = useQuery(PROFILE_STREAMING_REWARDS_QUERY, {
    variables: { profileId: userData?.me?.profile?.id || '' },
    skip: !userData?.me?.profile?.id,
    fetchPolicy: 'cache-first',
  })

  // Fetch listener rewards (WIN-WIN - earn by streaming others' tracks)
  const { data: myListenerRewardsData, loading: myListenerRewardsLoading } = useQuery(MY_LISTENER_REWARDS_QUERY, {
    skip: !userData?.me,
    fetchPolicy: 'cache-and-network',
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

  const myTotalUnclaimed = React.useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => {
      const earned = scid.ogunRewardsEarned || 0
      const claimed = scid.ogunRewardsClaimed || 0
      return total + Math.max(0, earned - claimed)
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
    variables: { limit: 15 }, // Increased back to 15 for full genre playback
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
  // Must use actual blockchain address - check HD wallet first (new users), then OAuth wallets
  const walletAddress = userData?.me?.hdWalletAddress
    || userData?.me?.magicWalletAddress
    || userData?.me?.googleWalletAddress
    || userData?.me?.discordWalletAddress
    || userData?.me?.twitchWalletAddress
    || userData?.me?.emailWalletAddress
  // For upgraded users: legacy OAuth wallet still holds NFTs — query it separately
  const legacyWalletAddr = userData?.me?.hdWalletAddress
    ? (userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress || null)
    : null
  const hasLegacyWithDifferentAddr = legacyWalletAddr && legacyWalletAddr.toLowerCase() !== (userData?.me?.hdWalletAddress || '').toLowerCase()
  const { data: ownedTracksData, loading: ownedTracksLoading, error: ownedTracksError } = useGroupedTracksQuery({
    variables: {
      filter: walletAddress ? { nftData: { owner: walletAddress } } : {},
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 50 }, // Load more for wallet/library view
    },
    skip: (selectedView !== 'wallet' && selectedView !== 'library') || !walletAddress, // Fetch on wallet and library pages
    fetchPolicy: 'cache-and-network', // Fresher data for owned NFTs
  })
  // Second query: NFTs on legacy OAuth wallet (only when user upgraded to HD and legacy is different)
  const { data: legacyOwnedTracksData, loading: legacyOwnedTracksLoading } = useGroupedTracksQuery({
    variables: {
      filter: hasLegacyWithDifferentAddr ? { nftData: { owner: legacyWalletAddr } } : {},
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 50 },
    },
    skip: !hasLegacyWithDifferentAddr || (selectedView !== 'wallet' && selectedView !== 'library'),
    fetchPolicy: 'cache-and-network',
  })

  // Fetch logged-in user's CREATED tracks (by profileId) for Tracks Collection modal
  const myProfileIdForTracks = userData?.me?.profile?.id
  const { data: myCreatedTracksData, loading: myCreatedTracksLoading } = useGroupedTracksQuery({
    variables: {
      filter: myProfileIdForTracks ? { profileId: myProfileIdForTracks } : {},
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 100 },
    },
    skip: !myProfileIdForTracks, // Fetch when logged in (for modal on any view)
    fetchPolicy: 'cache-first',
  })
  const myCreatedTracks = myCreatedTracksData?.groupedTracks?.nodes || []

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
    // Force refetch on mount to bypass cache
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
    skip: selectedView !== 'marketplace' && selectedView !== 'dashboard' && !(selectedView === 'profile' && profileTab === 'shop'), // SPEED: Only fetch when needed (includes profile Shop tab)
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
  const { data: exploreUsersData, loading: exploreUsersLoading, error: exploreUsersError, refetch: refetchUsers, fetchMore: fetchMoreUsers } = useExploreUsersSlimQuery({
    variables: {
      search: debouncedSearchQuery.trim() || undefined,
      page: { first: 200 }
    },
    skip: selectedView !== 'explore' && selectedView !== 'users',
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  })

  // Fetch all users from unified Atlas database
  const [atlasAgents, setAtlasAgents] = useState<any[]>([])
  useEffect(() => {
    if (selectedView !== 'explore' && selectedView !== 'users') return
    const search = debouncedSearchQuery.trim()
    const url = `/api/explore/users-merged?limit=500${search ? `&search=${encodeURIComponent(search)}` : ''}`
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.nodes) setAtlasAgents(data.nodes)
      })
      .catch(() => {}) // silently fail — GraphQL still works as fallback
  }, [selectedView, debouncedSearchQuery])

  // State for loading more users
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false)

  // Function to load more users (useCallback for infinite scroll sentinel stability)
  const handleLoadMoreUsers = useCallback(async () => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreUsersData, loadingMoreUsers, fetchMoreUsers])

  // Chats/Messages Query - fetch all conversations with polling
  const { data: chatsData, loading: chatsLoading, refetch: refetchChats } = useChatsQuery({
    skip: selectedView !== 'messages' || !userData?.me,
    fetchPolicy: 'cache-and-network',
    pollInterval: selectedView === 'messages' ? 15000 : 0, // Poll every 15s when on messages
  })

  // Reset unread count when opening messages view
  const [resetUnreadCount] = useResetUnreadMessageCountMutation()
  useEffect(() => {
    if (selectedView === 'messages' && userData?.me) {
      resetUnreadCount()
    }
  }, [selectedView, userData?.me])

  // Lazy query for loading chat history when a conversation is selected
  const [loadChatHistory, { data: chatHistoryData, loading: chatHistoryLoading }] = useChatHistoryLazyQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: selectedChatId ? 5000 : 0, // Poll every 5s when in active chat
  })

  // Send message mutation
  const [sendMessage, { loading: sendingMessage }] = useSendMessageMutation({
    onCompleted: () => {
      setMessageInput('')
      refetchChats()
      if (selectedChatId) {
        loadChatHistory({ variables: { profileId: selectedChatId } })
      }
      // Auto-scroll to bottom after sending
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
    onError: (error) => {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message. Please try again.')
    }
  })

  // Load chat history when a conversation is selected
  useEffect(() => {
    if (selectedChatId && selectedView === 'messages') {
      loadChatHistory({ variables: { profileId: selectedChatId } })
    }
  }, [selectedChatId, selectedView, loadChatHistory])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatHistoryData?.chatHistory?.nodes?.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [chatHistoryData?.chatHistory?.nodes?.length])

  // Resolve selected chat's recipient profile from conversations list
  const selectedChatProfile = chatsData?.chats?.nodes?.find(
    (chat: any) => (chat.profile?.id || chat.id) === selectedChatId
  )?.profile

  // Explore Tracks Query - search for tracks
  // Load 200 tracks at once for full genre browsing — genre filtering done client-side
  const { data: exploreTracksData, loading: exploreTracksLoading, fetchMore: fetchMoreExploreTracks } = useExploreTracksSlimQuery({
    variables: {
      search: debouncedSearchQuery.trim() || undefined,
      page: { first: 200 }
    },
    skip: selectedView !== 'explore',
    fetchPolicy: 'cache-first',
  })

  // Genre counts for explore pills (separate lightweight query)
  const { data: genreCountsData } = useExploreGenreCountsQuery({
    skip: selectedView !== 'explore',
    fetchPolicy: 'cache-first',
  })

  // Favorite Tracks Query - for Library view AND Tracks Collection modal
  const { data: favoriteTracksData, loading: favoriteTracksLoading } = useFavoriteTracksQuery({
    variables: {
      page: { first: 50 }
    },
    skip: !userData?.me, // Always fetch when logged in (needed for modal on any view)
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

  // Edition Sequencer — fetch all individual tracks in the same edition for the detail page
  const [fetchEditionTracks, { data: editionTracksData, loading: editionTracksLoading }] = useTracksLazyQuery()
  useEffect(() => {
    const edId = trackDetailData?.track?.trackEditionId
    if (edId && selectedView === 'track') {
      fetchEditionTracks({ variables: { filter: { trackEditionId: edId }, page: { first: 100 } } })
    }
  }, [trackDetailData?.track?.trackEditionId, selectedView, fetchEditionTracks])

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

  // Transform tracks to NFT collection format — deduplicate editions
  const viewingProfileNFTs = useMemo(() => {
    const raw = viewingProfileNFTsData?.groupedTracks?.nodes || []
    const seen = new Set<string>()
    const deduped: any[] = []
    for (const t of raw) {
      const edKey = (t as any).trackEditionId || t.id
      if (seen.has(edKey)) continue
      seen.add(edKey)
      deduped.push({
        id: t.id,
        title: t.title || 'Untitled',
        artist: t.artist || t.profile?.displayName || 'Unknown Artist',
        artworkUrl: t.artworkMedia?.url || t.coverMedia?.url || t.artworkUrl,
        audioUrl: t.streamMedia?.url || t.audioMedia?.url,
        tokenId: t.tokenId,
        editionSize: (t as any).editionSize,
        chain: 'Polygon',
      })
    }
    return deduped
  }, [viewingProfileNFTsData])

  // Lazy queries for followers/following — fire when stats modal opens
  const [fetchViewingFollowers, { data: viewingProfileFollowersData, loading: viewingFollowersLoading }] = useFollowersLazyQuery()
  const [fetchViewingFollowing, { data: viewingProfileFollowingData, loading: viewingFollowingLoading }] = useFollowingLazyQuery()

  // Fire queries when stats modal or top friends picker opens
  useEffect(() => {
    if (profileStatsModal === 'followers' && viewingProfile?.id) {
      fetchViewingFollowers({ variables: { profileId: viewingProfile.id, page: { first: 200 } }, fetchPolicy: 'network-only' })
    }
    if ((profileStatsModal === 'following' || showTopFriendsPicker) && viewingProfile?.id) {
      fetchViewingFollowing({ variables: { profileId: viewingProfile.id, page: { first: 200 } }, fetchPolicy: 'network-only' })
    }
  }, [profileStatsModal, showTopFriendsPicker, viewingProfile?.id])

  // Transform followers data (filter out null profiles)
  const followersList = viewingProfileFollowersData?.followers?.nodes
    ?.filter(f => f?.followerProfile)
    ?.map(f => ({
      id: f.followerProfile.id,
      name: f.followerProfile.displayName || f.followerProfile.userHandle,
      username: `@${f.followerProfile.userHandle}`,
      userHandle: f.followerProfile.userHandle,
      avatar: f.followerProfile.profilePicture || undefined,
      isVerified: f.followerProfile.verified || f.followerProfile.teamMember || false,
    })) || []

  // Transform following data (filter out null profiles)
  const followingList = viewingProfileFollowingData?.following?.nodes
    ?.filter(f => f?.followedProfile)
    ?.map(f => ({
      id: f.followedProfile.id,
      name: f.followedProfile.displayName || f.followedProfile.userHandle,
      username: `@${f.followedProfile.userHandle}`,
      userHandle: f.followedProfile.userHandle,
      avatar: f.followedProfile.profilePicture || undefined,
      isVerified: f.followedProfile.verified || f.followedProfile.teamMember || false,
    })) || []

  // Query for LOGGED-IN user's followers (for modal on feed view)
  const myProfileIdForFollowers = userData?.me?.profile?.id
  const { data: myFollowersData } = useFollowersQuery({
    variables: {
      profileId: myProfileIdForFollowers || '',
      page: { first: 100 },
    },
    skip: !myProfileIdForFollowers,
    fetchPolicy: 'cache-first',
  })
  const { data: myFollowingData } = useFollowingQuery({
    variables: {
      profileId: myProfileIdForFollowers || '',
      page: { first: 100 },
    },
    skip: !myProfileIdForFollowers,
    fetchPolicy: 'cache-first',
  })

  // Transform logged-in user's followers/following for modals
  const myFollowersList = myFollowersData?.followers?.nodes
    ?.filter(f => f?.followerProfile)
    ?.map(f => ({
      id: f.followerProfile.id,
      name: f.followerProfile.displayName || f.followerProfile.userHandle,
      username: `@${f.followerProfile.userHandle}`,
      userHandle: f.followerProfile.userHandle,
      avatar: f.followerProfile.profilePicture || undefined,
      isVerified: f.followerProfile.verified || f.followerProfile.teamMember || false,
    })) || []

  const myFollowingList = myFollowingData?.following?.nodes
    ?.filter(f => f?.followedProfile)
    ?.map(f => ({
      id: f.followedProfile.id,
      name: f.followedProfile.displayName || f.followedProfile.userHandle,
      username: `@${f.followedProfile.userHandle}`,
      userHandle: f.followedProfile.userHandle,
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

  // Set default profile tab — Wall is always default (MySpace style)
  // Also forces Wall tab when ?wall= deep-link param is present
  useEffect(() => {
    if (selectedView === 'profile') {
      setProfileTab('wall')
    }
  }, [selectedView, isViewingOwnProfile, wallPostId])

  // --- MySpace Visibility: Profile View Counter ---
  const [logProfileView] = useMutation(LOG_PROFILE_VIEW_MUTATION)

  // Log profile view when visiting another user's profile
  useEffect(() => {
    if (selectedView === 'profile' && viewingProfile?.id && !isViewingOwnProfile && me?.profile?.id) {
      logProfileView({ variables: { viewedProfileId: viewingProfile.id } }).catch(() => {})
    }
  }, [selectedView, viewingProfile?.id, isViewingOwnProfile, me?.profile?.id])

  // Fetch view count for the profile being viewed
  const { data: viewCountData } = useQuery(PROFILE_VIEW_COUNT_QUERY, {
    variables: { profileId: viewingProfile?.id || '' },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-and-network',
  })

  // --- MySpace Phase 2: Mutations for Featured Track & Top Friends ---
  const [updateFeaturedTrack] = useMutation(UPDATE_FEATURED_TRACK_MUTATION)
  const [updateTopFriends] = useMutation(UPDATE_TOP_FRIENDS_MUTATION)

  // Top Friends Profiles query — always fetch on profile pages, let backend return [] if none
  // Removed hasTopFriends skip gate to fix persistence bug: after fresh login, topFriends
  // from Me/ProfileByHandle may not be available yet when skip is first evaluated
  const hasTopFriends = !!(viewingProfile as any)?.topFriends?.length || selectedTopFriends.length > 0
  const { data: topFriendsData, refetch: refetchTopFriends } = useQuery(TOP_FRIENDS_PROFILES_QUERY, {
    variables: { profileId: viewingProfile?.id || '' },
    skip: !viewingProfile?.id || selectedView !== 'profile',
    fetchPolicy: 'cache-and-network',
  })

  // Initialize selectedTopFriends from profile data when viewing own profile
  // Only sync from server when picker is CLOSED — prevents resetting user's in-progress edits
  useEffect(() => {
    if (isViewingOwnProfile && !showTopFriendsPicker && (viewingProfile as any)?.topFriends) {
      setSelectedTopFriends((viewingProfile as any).topFriends)
    }
  }, [isViewingOwnProfile, showTopFriendsPicker, (viewingProfile as any)?.topFriends])

  const { data: playlistsData, loading: playlistsLoading, error: playlistsError, refetch: refetchPlaylists } = useGetUserPlaylistsQuery({
    variables: {},
    skip: shouldSkipPlaylists,
    fetchPolicy: 'network-only', // Always fetch fresh, don't use cache
    errorPolicy: 'all', // Return partial data even if there are errors
  })

  // Lazy query for fetching a specific playlist by ID (for share links)
  const [fetchPlaylistById, { data: sharedPlaylistData }] = usePlaylistLazyQuery()

  // Auto-open PlaylistDetail when navigating to /dex/playlist/{id}
  // Handles share links: first check own playlists, then fetch by ID
  useEffect(() => {
    if (routeType !== 'playlist' || !routeId || selectedPlaylist) return

    // Check if playlist exists in own playlists data
    const ownPlaylist = playlistsData?.getUserPlaylists?.nodes?.find((p) => p.id === routeId)
    if (ownPlaylist) {
      setSelectedPlaylist(ownPlaylist)
      return
    }

    // Not found in own playlists (shared link from another user) — fetch basic info
    if (!playlistsLoading) {
      fetchPlaylistById({ variables: { id: routeId } })
    }
  }, [routeType, routeId, playlistsData, playlistsLoading, selectedPlaylist])

  // When shared playlist data arrives, construct a playlist object for PlaylistDetail
  useEffect(() => {
    if (sharedPlaylistData?.playlist && routeType === 'playlist' && routeId && !selectedPlaylist) {
      const p = sharedPlaylistData.playlist
      setSelectedPlaylist({
        __typename: 'Playlist',
        id: p.id,
        title: p.title,
        description: p.description,
        artworkUrl: p.artworkUrl,
        profileId: p.profileId,
        favoriteCount: p.favoriteCount,
        followCount: p.followCount,
        isFavorite: false,
        isFollowed: false,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
        tracks: null,
      } as any)
    }
  }, [sharedPlaylistData, routeType, routeId, selectedPlaylist])

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

  // Resolve the actual blockchain address from the wallet selector value
  const resolveWalletAddress = (walletValue: string): string | undefined => {
    if (walletValue === 'hd') return userData?.me?.hdWalletAddress
    if (walletValue === 'legacy') return userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress
    if (walletValue === 'oauth') return userWallet
    return walletValue // external wallet address
  }

  // Handle NFT Transfer - calls ERC-721 transferFrom on-chain (with 0.05% of gas cost as platform fee)
  // Supports both OAuth wallet and external wallets (MetaMask, Coinbase, etc.)
  const handleTransferNFT = async () => {
    // Determine the from address based on selected source wallet
    const fromAddress = resolveWalletAddress(transferSourceWallet)

    if (!transferRecipient || !selectedNftId || !fromAddress) {
      toast.error('Please enter a recipient address and select a track')
      return
    }
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(transferRecipient)) {
      toast.error('Invalid wallet address. Please enter a valid Ethereum address.')
      return
    }
    if (transferRecipient.toLowerCase() === fromAddress.toLowerCase()) {
      toast.error('Cannot transfer to yourself')
      return
    }

    // Find the selected track to get tokenId and contract address
    const selectedTrack = ownedTracks.find((t: any) => t.id === selectedNftId)
    if (!selectedTrack) {
      toast.error('Selected track not found')
      return
    }
    const tokenId = selectedTrack.nftData?.tokenId || selectedTrack.tokenId
    if (!tokenId) {
      toast.error('This track has no on-chain token ID')
      return
    }

    // Get web3 instance based on selected wallet type
    let web3Instance: Web3
    if (transferSourceWallet === 'oauth' || transferSourceWallet === 'hd' || transferSourceWallet === 'legacy') {
      web3Instance = magicWeb3 || new Web3(process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com')
    } else {
      // Use window.ethereum for external wallets
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        web3Instance = new Web3((window as any).ethereum)
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      } else {
        toast.error('No external wallet found. Please install MetaMask or Coinbase Wallet.')
        return
      }
    }

    setTransferring(true)
    try {
      const treasuryAddress = config.treasuryAddress
      const gasPrice = await web3Instance.eth.getGasPrice()

      // Minimal ERC-721 ABI for transferFrom
      const erc721TransferAbi: AbiItem[] = [
        {
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
          ],
          name: 'transferFrom',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ]

      const nftContractAddress = selectedTrack.nftData?.contract || config.web3.contractsV2.contractAddress
      const contract = new web3Instance.eth.Contract(erc721TransferAbi, nftContractAddress)

      // Estimate gas for the transfer
      const tx = contract.methods.transferFrom(fromAddress, transferRecipient, tokenId)
      const gasEstimate = await tx.estimateGas({ from: fromAddress })
      const gasWithBuffer = Math.ceil(Number(gasEstimate) * 1.2)

      // Calculate 0.05% of gas cost as platform fee
      const platformFeeRate = config.soundchainFee || 0.0005
      const gasCostWei = BigInt(gasWithBuffer) * BigInt(gasPrice)
      const gasCostPol = parseFloat(web3Instance.utils.fromWei(gasCostWei.toString(), 'ether'))
      const platformFee = gasCostPol * platformFeeRate
      const feeWei = web3Instance.utils.toWei(platformFee.toFixed(18), 'ether')

      // Step 1: Send platform fee to treasury (0.05% of gas cost)
      console.log(`📤 Sending ${platformFee.toFixed(8)} POL fee (0.05% of ${gasCostPol.toFixed(6)} gas) to treasury: ${treasuryAddress}`)
      await web3Instance.eth.sendTransaction({
        from: fromAddress,
        to: treasuryAddress,
        value: feeWei,
        gas: 21000,
        gasPrice,
      })
      console.log('✅ Platform fee sent to treasury')

      // Step 2: Transfer NFT
      await tx.send({ from: fromAddress, gas: gasWithBuffer })

      toast.success(`Track transferred to ${transferRecipient.slice(0, 6)}...${transferRecipient.slice(-4)} (fee: ${platformFee.toFixed(8)} POL)`)
      setTransferRecipient('')
      setSelectedNftId('')
    } catch (err: any) {
      console.error('NFT Transfer error:', err)
      if (err.message?.includes('User denied') || err.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user')
      } else {
        toast.error(err.message?.slice(0, 120) || 'Transfer failed')
      }
    } finally {
      setTransferring(false)
    }
  }

  // Handle Token Transfer (POL or OGUN) - with 0.05% platform fee
  // Supports both OAuth wallet and external wallets (MetaMask, Coinbase, etc.)
  const handleTransferToken = async () => {
    // Determine the from address based on selected source wallet
    const fromAddress = resolveWalletAddress(transferSourceWallet)

    if (!tokenRecipient || !transferAmount || !fromAddress) {
      toast.error('Please fill in recipient address and amount')
      return
    }
    if (!Web3.utils.isAddress(tokenRecipient)) {
      toast.error('Invalid wallet address. Please enter a valid Ethereum address.')
      return
    }
    if (tokenRecipient.toLowerCase() === fromAddress.toLowerCase()) {
      toast.error('Cannot transfer to yourself')
      return
    }
    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0')
      return
    }

    // Calculate 0.05% platform fee
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = amount * platformFeeRate
    const totalNeeded = amount + platformFee

    // Get balance for selected wallet
    let currentBalance: number
    if (transferSourceWallet === 'oauth' || transferSourceWallet === 'hd' || transferSourceWallet === 'legacy') {
      currentBalance = tokenTransferType === 'POL'
        ? parseFloat(maticBalance || '0')
        : parseFloat(ogunBalance || '0')
    } else {
      // External wallet - get balance from connectedExternalWallets
      const extWallet = connectedExternalWallets?.find(w => w.address.toLowerCase() === transferSourceWallet.toLowerCase())
      currentBalance = tokenTransferType === 'POL'
        ? parseFloat(extWallet?.balance || '0')
        : parseFloat(extWallet?.ogunBalance || '0')
    }

    if (totalNeeded > currentBalance) {
      toast.error(`Insufficient ${tokenTransferType} balance. Need ${totalNeeded.toFixed(6)} (${amount} + ${platformFee.toFixed(6)} fee)`)
      return
    }

    setIsTransferringToken(true)
    try {
      const { ethers } = await import('ethers')
      const treasuryAddress = config.treasuryAddress
      const isHdSource = transferSourceWallet === 'hd'
      const isMagicSource = transferSourceWallet === 'oauth' || transferSourceWallet === 'legacy'

      // --- HD Wallet: use server-side signing API (no Magic dependency) ---
      if (isHdSource) {
        const amountWei = ethers.utils.parseEther(transferAmount).toString()
        const feeWei = ethers.utils.parseEther(platformFee.toFixed(18)).toString()

        if (tokenTransferType === 'POL') {
          // Fee to treasury
          console.log(`📤 HD: Sending ${platformFee.toFixed(6)} POL fee to treasury`)
          await fetch('/api/hd-wallet/send-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: treasuryAddress, value: feeWei }),
          }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.error) })

          // Amount to recipient
          console.log(`📤 HD: Sending ${transferAmount} POL to ${tokenRecipient}`)
          await fetch('/api/hd-wallet/send-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: tokenRecipient, value: amountWei }),
          }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.error) })
        } else {
          // OGUN via HD wallet sign-tx API
          const SoundchainOGUN20 = (await import('contract/SoundchainOGUN20.sol/SoundchainOGUN20.json')).default
          const iface = new ethers.utils.Interface(SoundchainOGUN20.abi)

          // Fee
          console.log(`📤 HD: Sending ${platformFee.toFixed(6)} OGUN fee to treasury`)
          await fetch('/api/hd-wallet/sign-tx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: config.ogunTokenAddress, data: iface.encodeFunctionData('transfer', [treasuryAddress, feeWei]) }),
          }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.error) })

          // Amount
          console.log(`📤 HD: Sending ${transferAmount} OGUN to ${tokenRecipient}`)
          await fetch('/api/hd-wallet/sign-tx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: config.ogunTokenAddress, data: iface.encodeFunctionData('transfer', [tokenRecipient, amountWei]) }),
          }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.error) })
        }
      }
      // --- Magic/OAuth/Legacy: use ethers.js via Magic RPC provider (not web3.js) ---
      // Magic's relay can be flaky — retry up to 3 times with delay
      else if (isMagicSource && magic) {
        const provider = new ethers.providers.Web3Provider((magic as any).rpcProvider, { chainId: 137, name: 'matic' })
        const signer = provider.getSigner()
        const amountWei = ethers.utils.parseEther(transferAmount)
        const feeWei = ethers.utils.parseEther(platformFee.toFixed(18))

        // Retry helper for Magic RPC calls ([-32603] is transient)
        const magicRetry = async <T,>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> => {
          for (let i = 0; i < retries; i++) {
            try {
              return await fn()
            } catch (err: any) {
              const isRetryable = err?.message?.includes('-32603') || err?.message?.includes('Failed to fetch')
              if (!isRetryable || i === retries - 1) throw err
              const delay = 3000 * (i + 1)
              console.warn(`⚠️ ${label} attempt ${i + 1} failed, retrying in ${delay / 1000}s...`)
              await new Promise(r => setTimeout(r, delay))
            }
          }
          throw new Error('Max retries reached')
        }

        if (tokenTransferType === 'POL') {
          // Fee to treasury
          const feeTx = await magicRetry(
            () => signer.sendTransaction({ to: treasuryAddress, value: feeWei, chainId: 137 }),
            'Fee TX'
          )
          await feeTx.wait()

          // Amount to recipient
          const tx = await magicRetry(
            () => signer.sendTransaction({ to: tokenRecipient, value: amountWei, chainId: 137 }),
            'Transfer TX'
          )
          await tx.wait()
        } else {
          // OGUN transfer via ethers contract
          const SoundchainOGUN20 = (await import('contract/SoundchainOGUN20.sol/SoundchainOGUN20.json')).default
          const contract = new ethers.Contract(config.ogunTokenAddress, SoundchainOGUN20.abi, signer)

          const feeTx = await magicRetry(
            () => contract.transfer(treasuryAddress, feeWei),
            'OGUN Fee TX'
          )
          await feeTx.wait()

          const tx = await magicRetry(
            () => contract.transfer(tokenRecipient, amountWei),
            'OGUN Transfer TX'
          )
          await tx.wait()
        }
      }
      // --- External wallet: use window.ethereum via web3.js ---
      else {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
          throw new Error('No external wallet found. Please install MetaMask or Coinbase Wallet.')
        }
        const web3Instance = new Web3((window as any).ethereum)
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' })

        const amountWei = web3Instance.utils.toWei(transferAmount, 'ether')
        const feeWei = web3Instance.utils.toWei(platformFee.toFixed(18), 'ether')

        if (tokenTransferType === 'POL') {
          const gasPrice = await web3Instance.eth.getGasPrice()

          console.log(`📤 Sending ${platformFee.toFixed(6)} POL fee to treasury: ${treasuryAddress}`)
          await web3Instance.eth.sendTransaction({ from: fromAddress, to: treasuryAddress, value: feeWei, gas: 21000, gasPrice })

          await web3Instance.eth.sendTransaction({ from: fromAddress, to: tokenRecipient, value: amountWei, gas: 21000, gasPrice })
        } else {
          const SoundchainOGUN20 = (await import('contract/SoundchainOGUN20.sol/SoundchainOGUN20.json')).default
          const contract = new web3Instance.eth.Contract(SoundchainOGUN20.abi as AbiItem[], config.ogunTokenAddress)

          console.log(`📤 Sending ${platformFee.toFixed(6)} OGUN fee to treasury: ${treasuryAddress}`)
          const feeGas = await contract.methods.transfer(treasuryAddress, feeWei).estimateGas({ from: fromAddress })
          await contract.methods.transfer(treasuryAddress, feeWei).send({ from: fromAddress, gas: Math.ceil(Number(feeGas) * 1.2) })

          const gas = await contract.methods.transfer(tokenRecipient, amountWei).estimateGas({ from: fromAddress })
          await contract.methods.transfer(tokenRecipient, amountWei).send({ from: fromAddress, gas: Math.ceil(Number(gas) * 1.2) })
        }
      }

      toast.success(`${transferAmount} ${tokenTransferType} sent to ${tokenRecipient.slice(0, 6)}...${tokenRecipient.slice(-4)} (fee: ${platformFee.toFixed(6)})`)
      setTokenRecipient('')
      setTransferAmount('')
      if (refetchBalance) refetchBalance()
    } catch (err: any) {
      console.error('Token transfer error:', err)
      toast.error(`Transfer failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsTransferringToken(false)
    }
  }

  // Posts are now handled by the Posts component directly - no need for custom query
  // Memoize Posts to prevent re-renders when modal state changes (prevents video/audio from stopping)
  const MemoizedFeedPosts = useMemo(() => <Posts viewMode={viewMode} />, [viewMode])
  const MemoizedMyFeedPosts = useMemo(() => <Posts disableVirtualization viewMode={viewMode} />, [viewMode])

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
  // FIX: defaultWallet is ENUM, check ALL OAuth wallet addresses + external wallets
  const userWallet = userData?.me?.hdWalletAddress
    || userData?.me?.magicWalletAddress
    || userData?.me?.googleWalletAddress
    || userData?.me?.discordWalletAddress
    || userData?.me?.twitchWalletAddress
    || userData?.me?.emailWalletAddress
    || activeAddress // fallback to UnifiedWallet (MetaMask/Web3Modal)
  const userTracks = tracksData?.groupedTracks?.nodes || []
  // Deduplicate owned NFTs — use trackEditionId as primary key (correct grouping),
  // fall back to title+artwork combo for legacy tracks without edition IDs.
  // Merge HD wallet NFTs + legacy OAuth wallet NFTs (for upgraded users)
  const ownedTracksRaw = [
    ...(ownedTracksData?.groupedTracks?.nodes || []),
    ...(legacyOwnedTracksData?.groupedTracks?.nodes || []),
  ]
  const ownedTracks = ownedTracksRaw.reduce((acc: any[], track: any) => {
    const edKey = track.trackEditionId || `${track.title || ''}::${track.artworkUrl || track.id}`
    if (!acc.some((t: any) => (t.trackEditionId || `${t.title || ''}::${t.artworkUrl || t.id}`) === edKey)) {
      acc.push(track)
    }
    return acc
  }, [])
  const marketTracks = listingData?.listingItems?.nodes || []

  // Sweep toggle helpers
  const toggleSweepSelect = (trackId: string) => {
    setSweepSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }
  const selectAllForSweep = () => {
    const allIds = ownedTracks.filter((t: any) => t.nftData?.tokenId || t.tokenId).map((t: any) => t.id)
    setSweepSelectedIds(new Set(allIds))
  }
  const deselectAllForSweep = () => setSweepSelectedIds(new Set())

  // Handle Sweep - batch transfer NFTs via individual transferFrom calls (with 0.05% of gas cost as platform fee)
  // Supports both OAuth wallet and external wallets (MetaMask, Coinbase, etc.)
  const handleSweep = async () => {
    // Determine the from address based on selected source wallet
    const fromAddress = resolveWalletAddress(transferSourceWallet)

    if (!sweepRecipient || sweepSelectedIds.size === 0 || !fromAddress) {
      toast.error('Please select tracks and enter a recipient address')
      return
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(sweepRecipient)) {
      toast.error('Invalid wallet address. Please enter a valid Ethereum address.')
      return
    }
    if (sweepRecipient.toLowerCase() === fromAddress.toLowerCase()) {
      toast.error('Cannot sweep to yourself')
      return
    }

    const tracksToSweep = ownedTracks.filter((t: any) => sweepSelectedIds.has(t.id) && (t.nftData?.tokenId || t.tokenId))
    if (tracksToSweep.length === 0) {
      toast.error('Selected tracks have no on-chain token IDs')
      return
    }

    setSweeping(true)
    setSweepProgress({ current: 0, total: tracksToSweep.length })

    // Get web3 instance based on selected wallet type
    let web3Instance: Web3
    if (transferSourceWallet === 'oauth' || transferSourceWallet === 'hd' || transferSourceWallet === 'legacy') {
      web3Instance = magicWeb3 || new Web3('https://polygon-bor-rpc.publicnode.com')
    } else {
      // Use window.ethereum for external wallets
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        web3Instance = new Web3((window as any).ethereum)
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      } else {
        toast.error('No external wallet found. Please install MetaMask or Coinbase Wallet.')
        setSweeping(false)
        return
      }
    }
    const treasuryAddress = config.treasuryAddress
    const platformFeeRate = config.soundchainFee || 0.0005

    // Minimal ERC-721 ABI for transferFrom
    const erc721TransferAbi: AbiItem[] = [
      {
        inputs: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
        ],
        name: 'transferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]

    try {
      const gasPrice = await web3Instance.eth.getGasPrice()

      // Step 1: Estimate total gas for all transfers
      let totalGasEstimate = BigInt(0)
      const gasEstimates: { track: any; gas: number; contract: any; tx: any }[] = []

      for (const track of tracksToSweep) {
        const tokenId = track.nftData?.tokenId || track.tokenId
        const contractAddr = track.nftData?.contract || config.web3.contractsV2.contractAddress
        const contract = new web3Instance.eth.Contract(erc721TransferAbi, contractAddr)
        const tx = contract.methods.transferFrom(fromAddress, sweepRecipient, tokenId)
        const gas = await tx.estimateGas({ from: fromAddress })
        const gasWithBuffer = Math.ceil(Number(gas) * 1.2)
        totalGasEstimate += BigInt(gasWithBuffer)
        gasEstimates.push({ track, gas: gasWithBuffer, contract, tx })
      }

      // Calculate 0.05% of total gas cost as platform fee
      const totalGasCostWei = totalGasEstimate * BigInt(gasPrice)
      const totalGasCostPol = parseFloat(web3Instance.utils.fromWei(totalGasCostWei.toString(), 'ether'))
      const platformFee = totalGasCostPol * platformFeeRate
      const feeWei = web3Instance.utils.toWei(platformFee.toFixed(18), 'ether')

      // Step 2: Collect platform fee (0.05% of total gas cost)
      console.log(`📤 Sending ${platformFee.toFixed(8)} POL sweep fee (0.05% of ${totalGasCostPol.toFixed(6)} gas) to treasury: ${treasuryAddress}`)
      await web3Instance.eth.sendTransaction({
        from: fromAddress,
        to: treasuryAddress,
        value: feeWei,
        gas: 21000,
        gasPrice,
      })
      console.log('✅ Sweep platform fee sent to treasury')
      toast.success(`Platform fee collected: ${platformFee.toFixed(8)} POL`)

      // Step 3: Transfer each NFT
      let succeeded = 0
      let failed = 0

      for (let i = 0; i < gasEstimates.length; i++) {
        const { track, gas, tx } = gasEstimates[i]
        const tokenId = track.nftData?.tokenId || track.tokenId

        try {
          setSweepProgress({ current: i + 1, total: tracksToSweep.length })
          await tx.send({ from: fromAddress, gas })
          succeeded++
          toast.success(`Transferred ${track.title || `Token #${tokenId}`} (${i + 1}/${tracksToSweep.length})`)
        } catch (err: any) {
          failed++
          console.error(`Sweep transfer failed for token ${tokenId}:`, err)
          toast.error(`Failed: ${track.title || `Token #${tokenId}`} - ${err.message?.slice(0, 80) || 'Unknown error'}`)
        }
      }

      setSweeping(false)
      setSweepProgress({ current: 0, total: 0 })

      if (succeeded > 0) {
        toast.success(`Transfer complete! ${succeeded} track${succeeded > 1 ? 's' : ''} transferred${failed > 0 ? `, ${failed} failed` : ''} (fee: ${platformFee.toFixed(8)} POL)`)
        setSweepSelectedIds(new Set())
        setSweepRecipient('')
        setShowSweepPanel(false)
        refetchBalance?.()
      } else {
        toast.error('All transfers failed. Check wallet connection and gas balance.')
      }
    } catch (err: any) {
      console.error('Sweep error:', err)
      toast.error(`Sweep failed: ${err.message || 'Unknown error'}`)
      setSweeping(false)
      setSweepProgress({ current: 0, total: 0 })
    }
  }

  // Handle Profile Tip - Send OGUN to profile with 0.05% fee
  // Supports both Magic (OAuth) wallet and external wallets (MetaMask/Web3Modal)
  const handleProfileTip = async () => {
    if (!profileTipAmount || parseFloat(profileTipAmount) <= 0) {
      toast.error('Please enter a valid tip amount')
      return
    }
    if (!viewingProfile?.magicWalletAddress) {
      toast.error('Recipient has no wallet address')
      return
    }

    // Determine sender wallet based on selection
    const senderWallet = tipSelectedWallet === 'external' && activeAddress
      ? activeAddress
      : userWallet

    if (!senderWallet) {
      toast.error('No wallet connected. Please connect a wallet first.')
      return
    }

    const amount = parseFloat(profileTipAmount)
    const platformFeeRate = config.soundchainFee || 0.0005
    const platformFee = amount * platformFeeRate
    const totalNeeded = amount + platformFee

    // Check OGUN balance based on selected wallet
    const availableBalance = tipSelectedWallet === 'external'
      ? parseFloat(activeOgunBalance || '0')
      : parseFloat(ogunBalance || '0')

    if (totalNeeded > availableBalance) {
      toast.error(`Insufficient OGUN. Need ${totalNeeded.toFixed(6)} (${amount} + ${platformFee.toFixed(6)} fee)`)
      return
    }

    setProfileTipSending(true)
    try {
      // Use appropriate web3 instance based on wallet type
      const web3Instance = tipSelectedWallet === 'external' && window.ethereum
        ? new Web3(window.ethereum as any)
        : magicWeb3 || new Web3('https://polygon-bor-rpc.publicnode.com')

      const treasuryAddress = config.treasuryAddress
      const amountWei = web3Instance.utils.toWei(profileTipAmount, 'ether')
      const feeWei = web3Instance.utils.toWei(platformFee.toFixed(18), 'ether')
      const gasPrice = await web3Instance.eth.getGasPrice()

      // OGUN contract
      const SoundchainOGUN20 = (await import('contract/SoundchainOGUN20.sol/SoundchainOGUN20.json')).default
      const contract = new web3Instance.eth.Contract(
        SoundchainOGUN20.abi as AbiItem[],
        config.ogunTokenAddress
      )

      // Step 1: Send platform fee to treasury (0.05% of tip)
      console.log(`📤 Sending ${platformFee.toFixed(8)} OGUN tip fee from ${senderWallet} to treasury: ${treasuryAddress}`)
      const feeTx = contract.methods.transfer(treasuryAddress, feeWei)
      const feeGas = await feeTx.estimateGas({ from: senderWallet })
      await feeTx.send({ from: senderWallet, gas: Math.ceil(Number(feeGas) * 1.2), gasPrice })
      console.log('✅ Tip platform fee sent to treasury')

      // Step 2: Send tip to recipient
      const tipTx = contract.methods.transfer(viewingProfile.magicWalletAddress, amountWei)
      const tipGas = await tipTx.estimateGas({ from: senderWallet })
      await tipTx.send({ from: senderWallet, gas: Math.ceil(Number(tipGas) * 1.2), gasPrice })

      toast.success(`🎉 Sent ${profileTipAmount} OGUN to ${viewingProfile.name || viewingProfile.userHandle}!`)
      setProfileTipAmount('')
      setShowProfileTipJar(false)
      if (refetchBalance) refetchBalance()
    } catch (err: any) {
      console.error('Profile tip error:', err)
      toast.error(`Tip failed: ${err.message || 'Unknown error'}`)
    } finally {
      setProfileTipSending(false)
    }
  }

  // Badge data available: user.badges, user.teamMember, user.verified

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
          {ogData.image && <meta property="og:image:width" content="1200" />}
          {ogData.image && <meta property="og:image:height" content="630" />}
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
      {/* Full-screen Cover Photo Background - supports both images and videos */}
      <div className="fixed inset-0 z-0">
        {selectedView === 'profile' && viewingProfile?.coverPicture ? (
          /* Viewing another user's profile - show their cover (image or video) */
          <>
            {/\.(mp4|mov|webm|avi|mkv)$/i.test(viewingProfile.coverPicture) ? (
              <video
                src={viewingProfile.coverPicture}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onError={(e) => console.error('❌ ViewingProfile cover video failed:', viewingProfile.coverPicture, e)}
                onLoadedData={() => console.log('✅ ViewingProfile cover video loaded:', viewingProfile.coverPicture)}
              />
            ) : (
              <img
                src={viewingProfile.coverPicture}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={(e) => console.error('❌ ViewingProfile cover image failed:', viewingProfile.coverPicture, e)}
                onLoad={() => console.log('✅ ViewingProfile cover image loaded')}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
          </>
        ) : selectedView === 'profile' && !viewingProfile?.coverPicture ? (
          /* Viewing profile but no cover - show gradient + debug */
          <>
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-cyan-900 to-black" />
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-4 left-4 text-xs text-yellow-400 bg-black/50 p-2 rounded">
                Debug: No coverPicture for viewingProfile
              </div>
            )}
          </>
        ) : user?.coverPicture && !coverImageError && !['wallet', 'settings', 'messages', 'notifications', 'admin'].includes(selectedView) ? (
          /* Own profile / social views - show logged-in user's cover (image or video) */
          /* Utility views (wallet, settings, etc.) use clean gradient for better readability */
          <>
            {/\.(mp4|mov|webm|avi|mkv)$/i.test(user.coverPicture) ? (
              <video
                src={user.coverPicture}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                onLoadedData={() => console.log('✅ User cover VIDEO loaded successfully')}
                onError={() => {
                  console.error('❌ Cover video failed to load:', user.coverPicture)
                  setCoverImageError(true)
                }}
              />
            ) : (
              <img
                src={user.coverPicture}
                alt="Cover"
                className="w-full h-full object-cover"
                onError={() => {
                  console.error('❌ Cover image failed to load:', user.coverPicture)
                  setCoverImageError(true)
                }}
                onLoad={() => {}}
              />
            )}
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

      <div className="relative pb-20">
        {/* Navigation Bar */}
        <nav className="backdrop-blur-xl bg-gray-900/95 border-b border-cyan-500/20 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 sticky top-0 z-50 shadow-lg" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 flex-shrink min-w-0">
              <Link href="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <Logo className="h-9 w-9 sm:h-12 sm:w-12" />
                <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
                  SoundChain
                </span>
              </Link>

              {/* Mobile WIN-WIN, Vibes, and Nearby buttons - visible on small screens only */}
              <div className="flex sm:hidden items-center gap-0 overflow-hidden">
                {/* Nearby (Bitchat) - Mobile */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowNearbyModal(!showNearbyModal); setShowWinWinStatsModal(false); setShowVibesModal(false); }}
                    className="hover:bg-green-500/10 px-1"
                    title="Nearby - Bitchat"
                  >
                    <Radio className="w-4.5 h-4.5 text-green-400" />
                  </Button>

                  {/* Nearby Dropdown - Mobile (fixed centered) */}
                  {showNearbyModal && (
                    <>
                      <div className="fixed inset-0 z-[98] pointer-events-none" />
                      <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[20rem] z-[99] shadow-2xl border-2 border-green-500/50 bg-gradient-to-b from-neutral-900 via-green-950/10 to-neutral-900 max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-3 border-b border-green-500/30 bg-gradient-to-r from-green-900/50 to-cyan-900/50">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                              <Radio className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Nearby</h3>
                              <p className="text-[10px] text-green-300/80">Chat via Bitchat</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setShowNearbyModal(false)} className="w-6 h-6 p-0 hover:bg-green-500/20">
                            <X className="w-4 h-4 text-green-400" />
                          </Button>
                        </div>
                        <div className="max-h-[calc(70vh-60px)] overflow-y-auto">
                          <ConcertChat showBitchatPromo={true} compact={true} />
                        </div>
                      </Card>
                    </>
                  )}
                </div>

                {/* PiggyBank with dropdown accordion */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowWinWinStatsModal(!showWinWinStatsModal); setShowNearbyModal(false); setShowVibesModal(false); }}
                    className="hover:bg-pink-500/10 px-1"
                    title="WIN-WIN Streaming Rewards"
                  >
                    <PiggyBank className="w-4.5 h-4.5 text-pink-400" />
                  </Button>

                  {/* WIN-WIN Accordion Dropdown - Fixed centered on mobile for proper positioning */}
                  {showWinWinStatsModal && (
                    <>
                      {/* Invisible backdrop - pointer-events-none so it NEVER interferes with media playback */}
                      <div className="fixed inset-0 z-[98] pointer-events-none" />
                      <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[18rem] z-[99] shadow-2xl max-h-[75vh] overflow-hidden border-2 border-orange-500/50 bg-gradient-to-b from-neutral-900 via-orange-950/10 to-neutral-900" onClick={(e) => e.stopPropagation()}>
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
                              <div className="text-[9px] text-cyan-500/70 uppercase">Earned</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.totalEarned || 0).toFixed(2)}
                              </div>
                              <div className="text-[9px] text-cyan-500/70">OGUN</div>
                            </div>
                            <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                              <div className="text-[9px] text-purple-500/70 uppercase">Streamed</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.tracksStreamedToday || 0)}
                              </div>
                              <div className="text-[9px] text-purple-500/70">Today</div>
                            </div>
                            <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                              <div className="text-[9px] text-green-500/70 uppercase">Today</div>
                              <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                                {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.dailyEarned || 0).toFixed(2)}
                              </div>
                              <div className="text-[9px] text-green-500/70">OGUN</div>
                            </div>
                          </div>
                          <div className="mt-2 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                            <p className="text-[9px] text-cyan-400 text-center">
                              🎧 WIN-WIN! Earn 30% when YOU stream tracks
                            </p>
                            <p className="text-[8px] text-gray-500 text-center mt-1">
                              Stream tracks for 30+ sec → Earn 0.15 OGUN each (max {myListenerRewardsData?.myListenerRewards?.dailyLimit || 50} OGUN/day)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Reward Rate - Universal */}
                      <div className="p-3 border-b border-orange-500/20">
                        <div className="text-center p-2 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/30">
                          <div className="text-[10px] text-green-400/80">All Tracks Earn Equal Rewards</div>
                          <div className="text-base font-bold text-green-400">0.5 OGUN</div>
                          <div className="text-[9px] text-gray-400">per stream (70% creator / 30% listener)</div>
                        </div>
                      </div>

                      {/* Unclaimed Amount */}
                      {myTotalUnclaimed > 0 && (
                        <div className="px-3 pt-2 text-center">
                          <p className="text-xs text-yellow-400 font-semibold">
                            {myTotalUnclaimed.toFixed(2)} OGUN unclaimed
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="p-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                          disabled={myTotalUnclaimed <= 0}
                          className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                            myTotalUnclaimed > 0
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Wallet className="w-3 h-3" />
                          Claim
                        </button>
                        <button
                          onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                          disabled={myTotalUnclaimed <= 0}
                          className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                            myTotalUnclaimed > 0
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          Stake
                        </button>
                      </div>

                      {/* Footer */}
                      <div className="px-3 pb-2 text-center">
                        <p className="text-[9px] text-gray-500">
                          {myTotalUnclaimed <= 0 ? 'Stream tracks to earn OGUN · ' : ''}Creator 70% · Listener 30% · 30sec min · Polygon
                        </p>
                      </div>
                    </Card>
                    </>
                  )}
                </div>

                {/* Vibes - Social Links Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowVibesModal(!showVibesModal); setShowNearbyModal(false); setShowWinWinStatsModal(false); }}
                    className="hover:bg-purple-500/10 px-1"
                    title="Follow Us"
                  >
                    <Users className="w-4.5 h-4.5 text-purple-400" />
                  </Button>

                  {/* Vibes Dropdown Modal - Fixed centered on mobile */}
                  {showVibesModal && (
                    <>
                      <div className="fixed inset-0 z-[98] pointer-events-none" />
                      <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[16rem] z-[99] shadow-2xl border-2 border-purple-500/50 bg-gradient-to-b from-neutral-900 via-purple-950/10 to-neutral-900" onClick={(e) => e.stopPropagation()}>
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
                    </>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMintClick}
                  className="hover:bg-purple-500/10 px-1"
                  title="Publish Track"
                >
                  <Music className="w-4.5 h-4.5 text-purple-400" />
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

                {/* Mint+ Button - NFT Minting with TrackMetadataForm */}
                {/* Supports both OAuth users (me) AND wallet-only users (isUnifiedWalletConnected) */}
                {isMinting ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMintClick}
                    className="hover:bg-purple-500/10 nyan-cat-animation"
                  >
                    <Music className="w-4 h-4 mr-2 text-purple-400" />
                    <span className="text-purple-400">Publishing...</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMintClick}
                    className="hover:bg-purple-500/10"
                  >
                    <Music className="w-4 h-4 mr-2 text-purple-400" />
                    <span className="text-purple-400">Publish+</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0 sm:gap-2 lg:gap-3 flex-shrink-0 ml-1 sm:ml-2">
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

              {/* Moltbook Agent Playground Button - hidden on mobile */}
              <Button variant="ghost" size="sm" onClick={() => router.push('/backend')} className="hover:bg-red-500/20 hidden sm:flex">
                <span className="text-xl">🦞</span>
                <span className="hidden xl:inline ml-2 text-red-400">Moltbook</span>
              </Button>

              {/* Nearby (Bitchat) - Desktop accordion modal */}
              <div className="relative hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowNearbyModal(!showNearbyModal); setShowNotifications(false); setShowWinWinStatsModal(false); setShowVibesModal(false); setShowUserMenu(false); }}
                  className="hover:bg-green-500/10"
                  title="Nearby - Bitchat"
                >
                  <Radio className="w-5 h-5 text-green-400" />
                </Button>

                {/* Nearby Dropdown Modal */}
                {showNearbyModal && (
                  <Card className="absolute right-0 top-12 w-96 z-50 shadow-2xl border-2 border-green-500/50 bg-gradient-to-b from-neutral-900 via-green-950/10 to-neutral-900 max-h-[80vh] overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-green-500/30 bg-gradient-to-r from-green-900/50 to-cyan-900/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                          <Radio className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Nearby</h3>
                          <p className="text-[10px] text-green-300/80">Chat with nearby users via Bitchat</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowNearbyModal(false)} className="w-6 h-6 p-0 hover:bg-green-500/20">
                        <X className="w-4 h-4 text-green-400" />
                      </Button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <ConcertChat showBitchatPromo={true} compact={true} />
                    </div>
                  </Card>
                )}
              </div>

              {/* PiggyBank (WIN-WIN Rewards) - Desktop accordion modal */}
              <div className="relative hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowWinWinStatsModal(!showWinWinStatsModal); setShowNotifications(false); setShowNearbyModal(false); setShowVibesModal(false); setShowUserMenu(false); }}
                  className="hover:bg-pink-500/10"
                  title="WIN-WIN Streaming Rewards"
                >
                  <PiggyBank className="w-5 h-5 text-pink-400" />
                </Button>

                {/* WIN-WIN Accordion Dropdown - Desktop */}
                {showWinWinStatsModal && (
                  <Card className="absolute right-0 top-12 w-80 z-50 shadow-2xl max-h-[80vh] overflow-hidden border-2 border-orange-500/50 bg-gradient-to-b from-neutral-900 via-orange-950/10 to-neutral-900">
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

                    {/* Tabs */}
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

                    {/* Catalog Tab */}
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
                      </div>
                    )}

                    {/* Listener Tab */}
                    {me && winWinRewardsTab === 'listener' && (
                      <div className="p-3 border-b border-cyan-500/20">
                        <div className="text-[10px] text-cyan-400/80 uppercase tracking-wider mb-2 text-center">
                          Your Listener Earnings (30% Listener Share)
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                            <div className="text-[9px] text-cyan-500/70 uppercase">Earned</div>
                            <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                              {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.totalEarned || 0).toFixed(2)}
                            </div>
                            <div className="text-[9px] text-cyan-500/70">OGUN</div>
                          </div>
                          <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <div className="text-[9px] text-purple-500/70 uppercase">Streamed</div>
                            <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                              {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.tracksStreamedToday || 0)}
                            </div>
                            <div className="text-[9px] text-purple-500/70">Today</div>
                          </div>
                          <div className="text-center p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                            <div className="text-[9px] text-green-500/70 uppercase">Today</div>
                            <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                              {myListenerRewardsLoading ? '...' : (myListenerRewardsData?.myListenerRewards?.dailyEarned || 0).toFixed(2)}
                            </div>
                            <div className="text-[9px] text-green-500/70">OGUN</div>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                          <p className="text-[9px] text-cyan-400 text-center">
                            🎧 WIN-WIN! Earn 30% when YOU stream tracks
                          </p>
                          <p className="text-[8px] text-gray-500 text-center mt-1">
                            Stream tracks for 30+ sec → Earn 0.15 OGUN each (max {myListenerRewardsData?.myListenerRewards?.dailyLimit || 50} OGUN/day)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reward Rate - Universal */}
                    <div className="p-3 border-b border-orange-500/20">
                      <div className="text-center p-2 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/30">
                        <div className="text-[10px] text-green-400/80">All Tracks Earn Equal Rewards</div>
                        <div className="text-base font-bold text-green-400">0.5 OGUN</div>
                        <div className="text-[9px] text-gray-400">per stream (70% creator / 30% listener)</div>
                      </div>
                    </div>

                    {/* Unclaimed Amount */}
                    {myTotalUnclaimed > 0 && (
                      <div className="px-3 pt-2 text-center">
                        <p className="text-xs text-yellow-400 font-semibold">
                          {myTotalUnclaimed.toFixed(2)} OGUN unclaimed
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="p-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                        disabled={myTotalUnclaimed <= 0}
                        className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                          myTotalUnclaimed > 0
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Wallet className="w-3 h-3" />
                        Claim
                      </button>
                      <button
                        onClick={() => { setShowWinWinStatsModal(false); router.push('/dex/staking') }}
                        disabled={myTotalUnclaimed <= 0}
                        className={`py-2 font-bold rounded-lg text-sm flex items-center justify-center gap-1 transition-all ${
                          myTotalUnclaimed > 0
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        Stake
                      </button>
                    </div>

                    {/* Footer */}
                    {myTotalUnclaimed <= 0 && (
                      <div className="px-3 pb-2 text-center">
                        <p className="text-[9px] text-gray-500">
                          Stream tracks to earn OGUN · Creator 70% · Listener 30%
                        </p>
                      </div>
                    )}
                  </Card>
                )}
              </div>

              {/* Vibes (Social Links) - Desktop accordion modal */}
              <div className="relative hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowVibesModal(!showVibesModal); setShowNotifications(false); setShowNearbyModal(false); setShowWinWinStatsModal(false); setShowUserMenu(false); }}
                  className="hover:bg-purple-500/10"
                  title="Vibes - Social Links"
                >
                  <Users className="w-5 h-5 text-purple-400" />
                </Button>

                {/* Vibes Dropdown Modal - Desktop */}
                {showVibesModal && (
                  <Card className="absolute right-0 top-12 w-72 z-50 shadow-2xl border-2 border-purple-500/50 bg-gradient-to-b from-neutral-900 via-purple-950/10 to-neutral-900">
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
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                          <span className="text-white text-sm">📸</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs">Instagram</div>
                          <div className="text-[10px] text-pink-400">@soundchain.io</div>
                        </div>
                      </a>
                    </div>
                  </Card>
                )}
              </div>

              {/* DMs Icon */}
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-cyan-500/10"
                onClick={() => router.push('/dex/pulse', undefined, { shallow: false })}
              >
                <MessageCircle className="w-5 h-5" />
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

                {/* Notifications Dropdown - Mobile-optimized positioning */}
                {showNotifications && (
                  <Card className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-12 sm:w-96 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden">
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
                  <Card className="absolute right-0 top-12 w-72 retro-card z-50 shadow-2xl max-h-[80vh] overflow-y-auto">
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
                            <Link href="/dex/nearby">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10 relative" onClick={() => { setShowUserMenu(false); setSelectedView('nearby'); }}>
                                <Radio className="w-4 h-4 mr-3 text-green-400" />
                                <span className="flex-1 text-left">Nearby</span>
                                <Badge className="bg-green-500/20 text-green-400 text-[10px] px-1.5">Bitchat</Badge>
                              </Button>
                            </Link>
                          </div>

                          {/* Main Menu Items */}
                          <div className="py-3 space-y-1 border-b border-cyan-500/30">
                            <Link href="/dex/wallet">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('wallet')}}>
                                <WalletIcon className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Wallet</span>
                              </Button>
                            </Link>
                            <Link href="https://soundchain-1.gitbook.io/soundchain-docs/" target="_blank" rel="noreferrer">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
                                <Document className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Docs</span>
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                            <Link href="/dex/feedback">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('feedback')}}>
                                <Feedback className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Leave Feedback</span>
                              </Button>
                            </Link>
                            {userData?.me?.roles?.includes(Role.Admin) && (
                              <Link href="/dex/admin">
                                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('admin')}}>
                                  <VerifiedIcon className="w-4 h-4 mr-3" />
                                  <span className="flex-1 text-left">Admin Panel</span>
                                </Button>
                              </Link>
                            )}

                            {/* Get Verified Accordion */}
                            <div className="space-y-1">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm hover:bg-cyan-500/10"
                                onClick={() => setShowVerification(!showVerification)}
                              >
                                <ShieldCheck className="w-4 h-4 mr-3 text-purple-400" />
                                <span className="flex-1 text-left">Get Verified</span>
                                {existingRequest?.status === ProfileVerificationStatusType.Approved ? (
                                  <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1.5">Verified</Badge>
                                ) : existingRequest?.status === ProfileVerificationStatusType.Pending ? (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5">Pending</Badge>
                                ) : (
                                  showVerification ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>

                              {showVerification && (
                                <div className="pl-4 pr-2 py-3 space-y-3 bg-black/20 rounded-lg border border-purple-500/20">
                                  {existingRequest?.status === ProfileVerificationStatusType.Approved ? (
                                    <div className="flex items-center gap-2 text-green-400 text-xs">
                                      <Check className="w-3 h-3" />
                                      Your profile is verified
                                    </div>
                                  ) : existingRequest?.status === ProfileVerificationStatusType.Pending ? (
                                    <div className="flex items-center gap-2 text-yellow-400 text-xs">
                                      <AlertCircle className="w-3 h-3" />
                                      Verification request under review
                                    </div>
                                  ) : verifySuccess ? (
                                    <div className="flex items-center gap-2 text-green-400 text-xs">
                                      <Check className="w-3 h-3" />
                                      Request submitted — we'll review shortly
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-[10px] text-gray-400">Provide at least one link to verify your artist identity.</p>
                                      {verifyError && (
                                        <p className="text-[10px] text-red-400">{verifyError}</p>
                                      )}
                                      <div className="space-y-2">
                                        <input
                                          type="url"
                                          value={verifySoundcloud}
                                          onChange={(e) => setVerifySoundcloud(e.target.value)}
                                          placeholder="SoundCloud URL"
                                          className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                                        />
                                        <input
                                          type="url"
                                          value={verifyYoutube}
                                          onChange={(e) => setVerifyYoutube(e.target.value)}
                                          placeholder="YouTube URL"
                                          className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                                        />
                                        <input
                                          type="url"
                                          value={verifyBandcamp}
                                          onChange={(e) => setVerifyBandcamp(e.target.value)}
                                          placeholder="Bandcamp URL"
                                          className="w-full bg-black/50 border border-purple-500/20 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-400"
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={handleVerificationSubmit}
                                        disabled={verifyLoading || (!verifySoundcloud && !verifyYoutube && !verifyBandcamp)}
                                        className="w-full text-xs bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
                                      >
                                        {verifyLoading ? 'Submitting...' : 'Submit for Review'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Account Settings Accordion */}
                            <div className="space-y-1">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm hover:bg-cyan-500/10"
                                onClick={() => setShowAccountSettings(!showAccountSettings)}
                              >
                                <SettingsIcon className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Account Settings</span>
                                {showAccountSettings ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>

                              {/* Expandable Account Settings Fields */}
                              {showAccountSettings && (
                                <div className="pl-4 pr-2 py-3 space-y-4 bg-black/20 rounded-lg border border-cyan-500/20">
                                  {/* Success Message */}
                                  {accountSettingsSuccess && (
                                    <div className="flex items-center gap-2 text-green-400 text-xs bg-green-500/10 px-3 py-2 rounded">
                                      <Check className="w-3 h-3" />
                                      {accountSettingsSuccess}
                                    </div>
                                  )}

                                  {/* Display Name Field */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2">
                                      <User className="w-3 h-3" />
                                      Display Name
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={editDisplayName}
                                        onChange={(e) => setEditDisplayName(e.target.value)}
                                        className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                        placeholder="Your display name"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="px-3 border-cyan-500/50 hover:bg-cyan-500/20"
                                        onClick={handleSaveDisplayName}
                                        disabled={accountSettingsSaving || !editDisplayName.trim()}
                                      >
                                        {accountSettingsSaving ? '...' : 'Save'}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Handle/Username Field */}
                                  <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2">
                                      <AtSign className="w-3 h-3" />
                                      Username
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={editHandle}
                                        onChange={(e) => setEditHandle(e.target.value)}
                                        className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                        placeholder="Your username"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="px-3 border-cyan-500/50 hover:bg-cyan-500/20"
                                        onClick={handleSaveHandle}
                                        disabled={accountSettingsSaving || !editHandle.trim() || editHandle.trim().length < 2}
                                      >
                                        {accountSettingsSaving ? '...' : 'Save'}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">soundchain.io/dex/users/{editHandle || 'username'}</p>
                                  </div>

                                  {/* Nostr Identity */}
                                  {me?.nostrPubkey && (
                                    <div className="space-y-2">
                                      <label className="text-xs text-gray-400 flex items-center gap-2">
                                        <Radio className="w-3 h-3 text-orange-400" />
                                        Nostr Identity
                                      </label>
                                      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/30 rounded px-3 py-2">
                                        <code className="flex-1 text-xs text-orange-300 font-mono truncate">
                                          {me.nostrPubkey.slice(0, 12)}...{me.nostrPubkey.slice(-8)}
                                        </code>
                                        <button
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(me.nostrPubkey || '')
                                              setNostrPubkeyCopied(true)
                                              setTimeout(() => setNostrPubkeyCopied(false), 2000)
                                            } catch (err) {
                                              console.error('Failed to copy:', err)
                                            }
                                          }}
                                          className="p-1 bg-orange-500/20 hover:bg-orange-500/30 rounded transition-colors"
                                          title="Copy Nostr pubkey"
                                        >
                                          {nostrPubkeyCopied ? (
                                            <Check className="w-3 h-3 text-green-400" />
                                          ) : (
                                            <Copy className="w-3 h-3 text-orange-400" />
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-500">Add this pubkey in Bitchat to receive notifications</p>
                                    </div>
                                  )}

                                  {/* Link to full settings page */}
                                  <Link href="/dex/settings" onClick={() => setShowUserMenu(false)}>
                                    <p className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
                                      More settings →
                                    </p>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Logout */}
                          <div className="pt-3">
                            <Button variant="ghost" className="w-full justify-start text-sm text-red-400 hover:bg-red-500/10" onClick={() => { onLogout(); setShowUserMenu(false); }}>
                              <Logout className="w-4 h-4 mr-3" />
                              <span className="flex-1 text-left">Logout</span>
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

        {/* FURL — Agent Status Ticker (auth-gated) */}
        {me ? <AgentStatusTicker /> : (
          <div className="w-full h-7 flex items-center justify-center px-3 bg-black/80 border-b border-white/5">
            <span className="text-[10px] font-mono text-gray-500">
              <span className="text-cyan-500/40">✶</span>
              <span className="mx-1.5">FURL — AI-powered forge terminal</span>
              <span className="text-gray-600">·</span>
              <span className="ml-1.5 text-cyan-500/50">available for members</span>
            </span>
          </div>
        )}

        {/* Profile Header removed - Feed/Stories bar stays at top for clean layout */}

        {/* Main Content - Floats on cover art background */}
        <div className="max-w-screen-2xl mx-auto relative">
          {/* Horizontal scrolling nav pills */}
          <div className="flex items-center gap-1.5 mb-1 px-3 pt-1">
            <div className="flex-1 overflow-x-auto scrollbar-hide bg-black/60 backdrop-blur-md rounded-full px-2 py-1">
              <div className="flex items-center gap-1.5 min-w-max">
                {[
                  ...(me?.profile ? [{ id: 'profile', label: 'Profile', route: `/dex/users/${me?.profile?.userHandle}` }] : []),
                  { id: 'feed', label: 'Feed', route: '/dex/feed' },
                  { id: 'announcements', label: 'News', route: '/dex/announcements' },
                  { id: 'explore', label: 'Explore', route: '/dex/explore' },
                  { id: 'users', label: 'Users', route: '/dex/users' },
                  { id: 'radio', label: 'Radio', route: '/radio' },
                  { id: 'moltbook', label: 'Moltbook', route: '/backend' },
                  { id: 'library', label: 'Library', route: '/dex/library' },
                  { id: 'playlist', label: 'Playlists', route: '/dex/playlist' },
                ].map((item) => {
                  const isActive = selectedView === item.id || (item.id === 'profile' && isBioExpanded)
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIsBioExpanded(false)
                        router.push(item.route, undefined, { shallow: false })
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center flex-shrink-0 ml-1">
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'text-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'text-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline Profile Panel - Shows when bio icon is clicked */}
          {isBioExpanded && me?.profile && (
            <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-gradient-to-br from-black/60 to-purple-900/20 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {/* Cover gradient */}
                <div className="h-16 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20" />

                {/* Profile content */}
                <div className="px-4 pb-4 -mt-8">
                  {/* Avatar and close button row */}
                  <div className="flex items-start justify-between">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setIsBioExpanded(false)
                        router.push(`/dex/users/${me?.profile?.userHandle || userData?.me?.profile?.userHandle}`)
                      }}
                    >
                      <Avatar className="w-16 h-16 border-4 border-black/50 ring-2 ring-cyan-500/50">
                        {(me?.profile?.profilePicture || userData?.me?.profile?.profilePicture) ? (
                          <AvatarImage src={me?.profile?.profilePicture || userData?.me?.profile?.profilePicture} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-lg font-bold">
                          {(me?.profile?.displayName || userData?.me?.profile?.displayName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      onClick={() => setIsBioExpanded(false)}
                      className="mt-10 p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Name and handle */}
                  <div className="mt-2">
                    <h3
                      className="text-lg font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => {
                        setIsBioExpanded(false)
                        router.push(`/dex/users/${me?.profile?.userHandle || userData?.me?.profile?.userHandle}`)
                      }}
                    >
                      {me?.profile?.displayName || userData?.me?.profile?.displayName || 'Anonymous'}
                    </h3>
                    <p className="text-sm text-gray-400">@{me?.profile?.userHandle || userData?.me?.profile?.userHandle}</p>
                  </div>

                  {/* Stats row - stacked avatars and mini NFT cards */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    {/* Followers - stacked avatars */}
                    <button
                      onClick={() => {
                        setBioFollowModalType(FollowModalType.FOLLOWERS)
                        setShowBioFollowModal(true)
                      }}
                      className="flex items-center gap-2 hover:bg-white/5 px-3 py-2 rounded-xl transition-colors group"
                    >
                      <div className="flex -space-x-2">
                        {myFollowersList.slice(0, 4).map((follower, i) => (
                          <Avatar key={follower.id} className="w-7 h-7 border-2 border-black/50 ring-1 ring-purple-500/30" style={{ zIndex: 4 - i }}>
                            {follower.avatar ? <AvatarImage src={follower.avatar} /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                              {follower.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {myFollowersList.length === 0 && (
                          <div className="w-7 h-7 rounded-full bg-gray-700/50 border-2 border-black/50 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{me?.profile?.followerCount || userData?.me?.profile?.followerCount || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">followers</span>
                      </div>
                    </button>

                    {/* Following - stacked avatars */}
                    <button
                      onClick={() => {
                        setBioFollowModalType(FollowModalType.FOLLOWING)
                        setShowBioFollowModal(true)
                      }}
                      className="flex items-center gap-2 hover:bg-white/5 px-3 py-2 rounded-xl transition-colors group"
                    >
                      <div className="flex -space-x-2">
                        {myFollowingList.slice(0, 4).map((following, i) => (
                          <Avatar key={following.id} className="w-7 h-7 border-2 border-black/50 ring-1 ring-cyan-500/30" style={{ zIndex: 4 - i }}>
                            {following.avatar ? <AvatarImage src={following.avatar} /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs">
                              {following.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {myFollowingList.length === 0 && (
                          <div className="w-7 h-7 rounded-full bg-gray-700/50 border-2 border-black/50 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{me?.profile?.followingCount || userData?.me?.profile?.followingCount || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">following</span>
                      </div>
                    </button>

                    {/* Tracks - mini NFT artwork cards */}
                    <button
                      onClick={() => setShowBioTracksModal(true)}
                      className="flex items-center gap-2 hover:bg-white/5 px-3 py-2 rounded-xl transition-colors group"
                    >
                      <div className="flex -space-x-2">
                        {(ownedTracksData?.groupedTracks?.nodes || []).slice(0, 4).map((track: any, i: number) => (
                          <div key={track.id} className="w-7 h-7 rounded-md border-2 border-black/50 ring-1 ring-orange-500/30 overflow-hidden bg-gray-800" style={{ zIndex: 4 - i }}>
                            {track.artworkUrl ? (
                              <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                                <Music className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                        {(ownedTracksData?.groupedTracks?.nodes || []).length === 0 && (
                          <div className="w-7 h-7 rounded-md bg-gray-700/50 border-2 border-black/50 flex items-center justify-center">
                            <Music className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{me?.profile?.tracksCount || userData?.me?.profile?.tracksCount || 0}</span>
                        <span className="text-xs text-gray-500 ml-1">tracks</span>
                      </div>
                    </button>
                  </div>

                  {/* Bio text */}
                  {(me?.profile?.bio || userData?.me?.profile?.bio) && (
                    <p className="mt-3 text-sm text-gray-300 whitespace-pre-wrap break-words line-clamp-3">
                      {me?.profile?.bio || userData?.me?.profile?.bio}
                    </p>
                  )}

                  {/* Social Pills */}
                  {(() => {
                    const sm = me?.profile?.socialMedias || userData?.me?.profile?.socialMedias
                    if (!sm) return null
                    const entries = Object.entries(sm).filter(([k, v]) => k !== '__typename' && v)
                    if (!entries.length) return null
                    return (
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {entries.map(([k, v]) => (
                          <SocialMediaLink key={k} company={k as keyof typeof sm} handle={String(v)} />
                        ))}
                      </div>
                    )
                  })()}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      onClick={() => {
                        setIsBioExpanded(false)
                        router.push(`/dex/users/${me?.profile?.userHandle || userData?.me?.profile?.userHandle}`)
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400"
                      onClick={() => {
                        setIsBioExpanded(false)
                        setShowEditProfileModal(true)
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 24hr Stories/Reels Bar - BELOW feed tabs */}
          {(selectedView === 'feed' || selectedView === 'explore') && (
            <StoriesBar
              deepLinkStoryId={routeType === 'story' ? (slug?.[2] || undefined) : undefined}
              deepLinkUserHandle={routeType === 'story' ? (routeId || undefined) : undefined}
            />
          )}

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
                  <p className="text-sm text-gray-400 mb-4">Tracks available to collect</p>
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

          {/* Marketplace View - New L2 Powered Design */}
          {selectedView === 'marketplace' && (
            <MarketplaceView
              tracks={marketTracks}
              tokenListings={tokenListings}
              bundleListings={bundleListings}
              loading={listingLoading}
              onPlay={(track, index, playlist) => handlePlayTrack(track, index, playlist)}
              isPlaying={isPlaying}
              currentTrackId={currentSong?.trackId}
              account={walletAccount}
              onCreateTokenListing={() => setShowCreateTokenModal(true)}
              onCreateBundleListing={() => setShowCreateBundleModal(true)}
              onSweepClick={() => setShowSweepPanel(true)}
            />
          )}

          {/* Users View - Browse and Leaderboard for all profiles */}
          {selectedView === 'users' && (() => {
            // Merge GraphQL users + Atlas agents, deduplicate by id
            const graphqlUsers = exploreUsersData?.exploreUsers?.nodes || []
            const mergedIds = new Set<string>()
            const allUsers = [...graphqlUsers, ...atlasAgents]
              .filter((profile: any) => {
                if (!profile.userHandle || mergedIds.has(profile.id)) return false
                mergedIds.add(profile.id)
                return true
              })
            // Sort by createdAt for sequence numbering
            const sortedByCreation = [...allUsers].sort((a: any, b: any) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            // True total from API (e.g. 702) — used to offset sequence numbers
            // so newest user = #totalCount, oldest = #1
            const totalUsersCount = Math.max(exploreUsersData?.exploreUsers?.pageInfo?.totalCount || 0, allUsers.length)
            const seqOffset = totalUsersCount - sortedByCreation.length
            // New users = created in last 30 days
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
            const newUsers = allUsers.filter((p: any) => new Date(p.createdAt).getTime() > thirtyDaysAgo)
            // Genre grouping
            const genreColorMap: Record<string, string> = {
              hip_hop: 'from-cyan-500 to-blue-600', r_and_b: 'from-purple-500 to-pink-600',
              pop: 'from-pink-500 to-rose-600', electronic: 'from-cyan-400 to-teal-600',
              house: 'from-violet-500 to-purple-600', techno: 'from-indigo-500 to-blue-700',
              rock: 'from-red-500 to-orange-600', classic_rock: 'from-amber-500 to-red-600',
              hard_rock: 'from-red-600 to-red-800', metal: 'from-gray-500 to-gray-700',
              punk: 'from-green-500 to-lime-600', jazz: 'from-amber-400 to-yellow-600',
              blues: 'from-blue-600 to-indigo-700', soul_funk: 'from-orange-400 to-pink-500',
              reggae: 'from-green-400 to-yellow-500', latin: 'from-yellow-400 to-orange-500',
              country: 'from-amber-500 to-yellow-600', indie: 'from-teal-400 to-cyan-600',
              lo_fi: 'from-purple-400 to-indigo-500', ambient: 'from-blue-400 to-cyan-500',
              classical: 'from-amber-300 to-amber-600', gospel: 'from-yellow-400 to-amber-500',
              dance: 'from-pink-400 to-purple-500', experimental: 'from-fuchsia-500 to-violet-700',
              deep_house: 'from-purple-500 to-blue-600', jungle: 'from-green-600 to-emerald-800',
            }
            const genreDisplayName: Record<string, string> = {
              hip_hop: 'Hip Hop', r_and_b: 'R&B', pop: 'Pop', electronic: 'Electronic',
              house: 'House', techno: 'Techno', rock: 'Rock', classic_rock: 'Classic Rock',
              hard_rock: 'Hard Rock', metal: 'Metal', punk: 'Punk', jazz: 'Jazz',
              blues: 'Blues', soul_funk: 'Soul / Funk', reggae: 'Reggae', latin: 'Latin',
              country: 'Country', indie: 'Indie', lo_fi: 'Lo-Fi', ambient: 'Ambient',
              classical: 'Classical', gospel: 'Gospel', dance: 'Dance', experimental: 'Experimental',
              deep_house: 'Deep House', jungle: 'Jungle', reggaeton: 'Reggaeton', k_pop: 'K-Pop',
              samples: 'Samples', podcasts: 'Podcasts', spoken: 'Spoken', world: 'World',
              soundtrack: 'Soundtrack', soundbath: 'Soundbath', acoustic: 'Acoustic',
              alternative: 'Alternative', americana: 'Americana', cannabis: 'Cannabis',
              christian: 'Christian', devotional: 'Devotional', instrumental: 'Instrumental',
              musica_mexicana: 'Musica Mexicana', musica_tropical: 'Musica Tropical',
              pop_latino: 'Pop Latino', urban_latino: 'Urban Latino', salsa: 'Salsa',
              c_pop: 'C-Pop', kids_and_family: 'Kids & Family', bpm: 'BPM',
            }
            // Build genre -> users map (only genres with users)
            const genreMap = new Map<string, any[]>()
            allUsers.forEach((profile: any) => {
              (profile.favoriteGenres || []).forEach((g: string) => {
                if (!genreMap.has(g)) genreMap.set(g, [])
                genreMap.get(g)!.push(profile)
              })
            })
            // Sort genres by user count descending
            const activeGenres = [...genreMap.entries()].sort((a, b) => b[1].length - a[1].length)
            // Filtered users for browse — newest first (most recent joins at top)
            const filteredUsers = (usersGenreFilter
              ? allUsers.filter((p: any) => (p.favoriteGenres || []).includes(usersGenreFilter))
              : allUsers
            ).filter((p: any) => {
              if (!usersSearchQuery.trim()) return true
              const q = usersSearchQuery.toLowerCase()
              return (p.displayName?.toLowerCase().includes(q) || p.userHandle?.toLowerCase().includes(q))
            }).slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

            // Interactive L2 Cyberpunk User Pill — tap to expand, actions, neon glow
            const renderUserPill = (profile: any, index: number, showSequence?: boolean) => {
              const seqNum = seqOffset + sortedByCreation.findIndex((p: any) => p.id === profile.id) + 1
              const isNew = new Date(profile.createdAt).getTime() > thirtyDaysAgo
              const isExpanded = expandedPillId === profile.id
              let pillTouchStart: { x: number; y: number; time: number } | null = null

              const handlePillTap = (e: React.MouseEvent | React.TouchEvent) => {
                e.preventDefault()
                e.stopPropagation()
                if (isExpanded) {
                  // Second tap on expanded pill → navigate
                  saveUsersScrollPosition()
                  router.push(`/dex/users/${profile.userHandle}`)
                } else {
                  setExpandedPillId(profile.id)
                }
              }

              const handleTouchStart = (e: React.TouchEvent) => {
                const touch = e.touches[0]
                pillTouchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() }
              }

              const handleTouchEnd = (e: React.TouchEvent) => {
                if (!pillTouchStart) return
                const touch = e.changedTouches[0]
                const dx = Math.abs(touch.clientX - pillTouchStart.x)
                const dy = Math.abs(touch.clientY - pillTouchStart.y)
                // 5px threshold — distinguish tap from scroll
                if (dx < 5 && dy < 5) {
                  handlePillTap(e)
                }
                pillTouchStart = null
              }

              const handleAction = (e: React.MouseEvent, action: string) => {
                e.preventDefault()
                e.stopPropagation()
                saveUsersScrollPosition()
                setExpandedPillId(null)
                switch (action) {
                  case 'profile': router.push(`/dex/users/${profile.userHandle}`); break
                  case 'dm': router.push(`/dex/pulse`); break
                  case 'tip': router.push(`/dex/users/${profile.userHandle}?tab=tip`); break
                  case 'wall': router.push(`/dex/users/${profile.userHandle}?tab=wall`); break
                  case 'manager': router.push(`/dex/users/${profile.userHandle}?tab=manager`); break
                }
              }

              return (
                <div
                  key={profile.id}
                  data-pill-id={profile.id}
                  className={`relative transition-all duration-300 ease-out ${isExpanded ? 'z-20' : 'z-0'}`}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={(e) => { if (!('ontouchstart' in window)) handlePillTap(e) }}
                  style={isExpanded ? { touchAction: 'none' } : undefined}
                >
                  {/* Collapsed Pill — L2 neon node */}
                  <div className={`group flex items-center gap-2 px-2 py-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                    isExpanded
                      ? 'bg-gradient-to-r from-cyan-900/40 via-purple-900/40 to-pink-900/40 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3),inset_0_0_12px_rgba(6,182,212,0.1)]'
                      : 'bg-neutral-800/80 hover:bg-gradient-to-r hover:from-cyan-900/30 hover:via-purple-900/20 hover:to-transparent border border-neutral-700/50 hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  }`}>
                    <div className="relative flex-shrink-0">
                      {profile.profilePicture ? (
                        <img
                          src={profile.profilePicture} alt=""
                          className={`rounded-full object-cover transition-all duration-300 ${
                            isExpanded
                              ? 'w-10 h-10 ring-2 ring-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                              : 'w-7 h-7 ring-1 ring-neutral-600 group-hover:ring-cyan-500/60'
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <div className={`rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold transition-all duration-300 ${
                          isExpanded
                            ? 'w-10 h-10 text-sm ring-2 ring-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                            : 'w-7 h-7 text-xs ring-1 ring-neutral-600 group-hover:ring-cyan-500/60'
                        }`}>
                          {(profile.displayName || profile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      {isNew && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-neutral-800 animate-pulse" />}
                      {isExpanded && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                          <Zap className="w-1.5 h-1.5 text-cyan-400" />
                        </div>
                      )}
                    </div>
                    <div className={`flex flex-col transition-all duration-300 ${isExpanded ? 'min-w-[100px]' : ''}`}>
                      <div className="flex items-center gap-1">
                        <span className={`truncate transition-all duration-300 ${
                          isExpanded
                            ? 'text-sm font-medium text-white max-w-[120px]'
                            : 'text-xs text-gray-300 group-hover:text-white max-w-[80px]'
                        }`}>{profile.displayName || profile.userHandle}</span>
                        {profile.verified && <BadgeCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
                      </div>
                      {isExpanded && (
                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                          @{profile.userHandle} · <span className="text-cyan-500/70">L2#{seqNum}</span>
                        </span>
                      )}
                    </div>
                    {!isExpanded && showSequence && (
                      <span className="text-[9px] text-cyan-600/50 font-mono flex-shrink-0">#{seqNum}</span>
                    )}
                  </div>

                  {/* Expanded Action Bar — L2 neon action strip */}
                  {isExpanded && (
                    <div className="absolute left-0 right-0 top-full mt-1 flex items-center gap-1 p-1.5 rounded-lg bg-black/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(6,182,212,0.2)] animate-in fade-in slide-in-from-top-1 duration-200 min-w-max">
                      {[
                        { key: 'profile', icon: <User className="w-3 h-3" />, label: 'Profile', color: 'text-cyan-400 hover:bg-cyan-500/20' },
                        { key: 'dm', icon: <MessageCircle className="w-3 h-3" />, label: 'DM', color: 'text-purple-400 hover:bg-purple-500/20' },
                        { key: 'tip', icon: <Zap className="w-3 h-3" />, label: 'Tip', color: 'text-green-400 hover:bg-green-500/20' },
                        { key: 'wall', icon: <PenLine className="w-3 h-3" />, label: 'Wall', color: 'text-pink-400 hover:bg-pink-500/20' },
                        { key: 'manager', icon: <Bot className="w-3 h-3" />, label: 'Mgr', color: 'text-amber-400 hover:bg-amber-500/20' },
                      ].map(action => (
                        <button
                          key={action.key}
                          onClick={(e) => handleAction(e, action.key)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${action.color} hover:scale-105 active:scale-95`}
                          title={action.label}
                        >
                          {action.icon}
                          <span className="hidden sm:inline">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
            <div className="space-y-6">
              {/* Header + View mode pills — dark underlay for readability over cover */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    SoundChain Community
                  </h1>
                  {exploreUsersData?.exploreUsers?.nodes && (
                    <span className="text-xs text-gray-400 font-mono">{totalUsersCount} nodes</span>
                  )}
                </div>

                {/* View mode pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { key: 'new' as const, label: 'New', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'green', count: newUsers.length },
                    { key: 'browse' as const, label: 'Genres', icon: <Compass className="w-3.5 h-3.5" />, color: 'cyan' },
                    { key: 'leaderboard' as const, label: 'Top', icon: <Trophy className="w-3.5 h-3.5" />, color: 'purple' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setUsersViewMode(tab.key); setUsersGenreFilter(null); setExpandedPillId(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        usersViewMode === tab.key
                          ? tab.color === 'green' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                          : tab.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40'
                          : 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40'
                          : 'bg-white/10 text-gray-300 ring-1 ring-white/10 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count !== undefined && <span className="text-[10px] opacity-70">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => refetchUsers()} className="text-gray-500 hover:text-cyan-400 p-1">
                    <RefreshCw className={`w-3.5 h-3.5 ${exploreUsersLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Search users */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users by name or handle..."
                    value={usersSearchQuery}
                    onChange={(e) => setUsersSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {exploreUsersLoading && !exploreUsersData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
                    <span>Loading community...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* NEW USERS VIEW */}
                  {usersViewMode === 'new' && (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-500">Joined in the last 30 days — show them some love</p>
                      {newUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {[...newUsers]
                            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((profile: any, i: number) => renderUserPill(profile, i, true))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">No new users in the last 30 days</p>
                      )}
                    </div>
                  )}

                  {/* GENRE BROWSE VIEW — Merkle Tree Architecture */}
                  {usersViewMode === 'browse' && (
                    <div className="space-y-4 relative overflow-hidden rounded-2xl p-3">
                      <FluidBackground />
                      {/* Genre filter pills — the Merkle branches + Saturn rings hyperspace */}
                      <div className="relative overflow-hidden rounded-xl p-3 z-[1]">
                        <GenreHyperspaceRings />
                        <div className="flex flex-wrap gap-1.5 relative z-[1]" data-genre-grid>
                          <button
                            data-genre-pill="all"
                            onClick={() => { setUsersGenreFilter(null); setExpandedPillId(null) }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                              !usersGenreFilter
                                ? 'bg-white/20 text-white ring-1 ring-white/40 shadow-lg shadow-white/10'
                                : 'bg-white/10 text-gray-200 ring-1 ring-white/15 hover:bg-white/20 hover:text-white'
                            }`}
                          >
                            All
                          </button>
                          {activeGenres.map(([genre, users]) => (
                            <button
                              key={genre}
                              data-genre-pill={genre}
                              onClick={() => { setUsersGenreFilter(usersGenreFilter === genre ? null : genre); setExpandedPillId(null) }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all flex items-center gap-1 ${
                                usersGenreFilter === genre
                                  ? `bg-gradient-to-r ${genreColorMap[genre] || 'from-gray-500 to-gray-600'} text-white shadow-lg ring-1 ring-white/20`
                                  : 'bg-white/10 text-gray-200 ring-1 ring-white/15 hover:bg-white/20 hover:text-white'
                              }`}
                            >
                              {genreDisplayName[genre] || genre}
                              <span className="opacity-60">{users.length}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Connector line — the Merkle root + Share pill */}
                      {usersGenreFilter && (
                        <div className="flex items-center gap-2 px-2 relative z-[1]">
                          <div className={`h-0.5 flex-1 rounded bg-gradient-to-r ${genreColorMap[usersGenreFilter] || 'from-cyan-500 to-purple-500'} opacity-40`} />
                          <span className="text-[10px] text-gray-400 font-mono">{filteredUsers.length} nodes</span>
                          <button
                            onClick={async () => {
                              const genreName = genreDisplayName[usersGenreFilter] || usersGenreFilter
                              const shareUrl = `${window.location.origin}/dex/users?genre=${usersGenreFilter}`
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: `${genreName} on SoundChain`, text: `Check out ${genreName} artists on SoundChain`, url: shareUrl })
                                } catch { /* user cancelled */ }
                              } else {
                                await navigator.clipboard.writeText(shareUrl)
                                toast.success(`${genreName} link copied!`)
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/10 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 ring-1 ring-white/10 transition-all"
                            title={`Share ${genreDisplayName[usersGenreFilter] || usersGenreFilter} genre`}
                          >
                            <Share2 className="w-3 h-3" />
                            Share
                          </button>
                          <div className={`h-0.5 flex-1 rounded bg-gradient-to-l ${genreColorMap[usersGenreFilter] || 'from-cyan-500 to-purple-500'} opacity-40`} />
                        </div>
                      )}

                      {/* Jump-to pills — quick navigation for large user lists */}
                      {filteredUsers.length > 30 && (
                        <div className="flex items-center gap-2 px-2 relative z-[2]">
                          {[
                            { label: 'Top', idx: 0 },
                            { label: 'Mid', idx: Math.floor(filteredUsers.length / 2) },
                            { label: 'End', idx: filteredUsers.length - 1 },
                          ].map((jump) => (
                            <button
                              key={jump.label}
                              onClick={() => {
                                const el = document.querySelector(`[data-pill-id="${filteredUsers[jump.idx]?.id}"]`)
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }}
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 ring-1 ring-white/10 transition-all"
                            >
                              {jump.label} #{jump.idx + 1}
                            </button>
                          ))}
                          <span className="text-[9px] text-gray-500 font-mono ml-auto">{filteredUsers.length} total</span>
                        </div>
                      )}

                      {/* User pills — the Merkle leaves */}
                      <div className="flex flex-wrap gap-2 relative z-[1]">
                        <PillConnectorCanvas
                          genreFilter={usersGenreFilter}
                          sortedUserIds={filteredUsers
                            .slice()
                            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((p: any) => p.id)
                          }
                          expandedPillId={expandedPillId}
                        />
                        {filteredUsers.map((profile: any, i: number) => renderUserPill(profile, i, true))}
                      </div>

                      {/* Infinite scroll sentinel + loading indicator */}
                      <div className="relative z-[1]">
                        {loadingMoreUsers && (
                          <div className="flex items-center justify-center py-4 gap-2 text-cyan-400">
                            <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
                            <span className="text-xs font-mono">Loading nodes...</span>
                          </div>
                        )}
                        {exploreUsersData?.exploreUsers?.pageInfo?.hasNextPage && !loadingMoreUsers && (
                          <InfiniteScrollSentinel onIntersect={handleLoadMoreUsers} />
                        )}
                        {!exploreUsersData?.exploreUsers?.pageInfo?.hasNextPage && filteredUsers.length > 0 && (
                          <p className="text-center text-[10px] text-gray-600 font-mono py-4">{filteredUsers.length} nodes loaded — end of chain</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* LEADERBOARD VIEW */}
                  {usersViewMode === 'leaderboard' && (
                    <div className="space-y-1">
                      {[...allUsers]
                        .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
                        .slice(0, 20)
                        .map((profile: any, index: number) => {
                          const seqNum = sortedByCreation.findIndex((p: any) => p.id === profile.id) + 1
                          return (
                            <Link key={profile.id} href={`/dex/users/${profile.userHandle}`} onClick={saveUsersScrollPosition}>
                              <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-slate-400 text-black' :
                                  index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                                  'bg-neutral-800 text-gray-400'
                                }`}>{index + 1}</span>
                                {profile.profilePicture ? (
                                  <img src={profile.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700" loading="lazy" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {(profile.displayName || profile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium text-white truncate">{profile.displayName || profile.userHandle}</span>
                                    {profile.verified && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                                  </div>
                                  <p className="text-[10px] text-gray-500 truncate">@{profile.userHandle} · #{seqNum}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-sm font-bold text-purple-400">{(profile.followerCount || 0).toLocaleString()}</div>
                                  <div className="text-[9px] text-gray-600">followers</div>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
            )
          })()}

          {/* Feed View - 3-column desktop layout, full-width on mobile */}
          {selectedView === 'feed' && (
            <div className={`relative flex justify-center gap-0 xl:gap-6 min-h-screen py-2 md:py-4 -mx-2 px-2 md:-mx-4 md:px-4 ${currentSong?.src ? 'pb-24 md:pb-28' : ''}`}>
              {/* Left Sidebar - Mini Profile Dashboard (Desktop only) */}
              <MiniProfileDashboard />

              {/* Main Feed - Posts lead, clean and content-first */}
              {/* Using memoized Posts to prevent re-renders when header modals open (keeps video/audio playing) */}
              <div className="flex-1 max-w-full md:max-w-[680px]" style={{ minHeight: 'calc(100vh - 160px)' }}>
                {MemoizedFeedPosts}
              </div>

              {/* Right Sidebar - Trending, Featured Artists, Top 100 (Desktop only) */}
              <RightSidebar />

              {/* Floating Compose Button - Blade Runner / Cyberpunk style - Opens for ALL users */}
              <button
                onClick={() => dispatchShowCreateModal(true, 'post')}
                className="fixed bottom-24 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-black/80 backdrop-blur-xl border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.4),inset_0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6),inset_0_0_30px_rgba(6,182,212,0.2)] hover:border-cyan-400 hover:scale-110 active:scale-95 transition-all duration-300 md:bottom-8 md:right-8 group"
                aria-label="Create post"
              >
                {/* Pulsing glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse" />
                {/* Inner glow */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
                {/* Icon */}
                <PenLine className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </button>
            </div>
          )}

          {/* Single Post View - /dex/post/[id] for shared links */}
          {selectedView === 'post' && routeId && (
            <div className="flex justify-center gap-6 px-0 md:px-4 min-h-screen py-4">
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
            <div className="space-y-4 bg-black/70 backdrop-blur-sm rounded-xl p-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tracks, artists, users..."
                  value={exploreSearchQuery}
                  onChange={(e) => setExploreSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Genre Pills - dynamic from backend counts, shows ALL genres with tracks */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-1.5 min-w-max pb-1">
                  {(() => {
                    // Human-readable labels for genre enum values
                    const GENRE_LABELS: Record<string, string> = {
                      acoustic: 'Acoustic', alternative: 'Alternative', ambient: 'Ambient',
                      americana: 'Americana', blues: 'Blues', bpm: 'BPM', c_pop: 'C-Pop',
                      cannabis: 'Cannabis', christian: 'Christian', classic_rock: 'Classic Rock',
                      classical: 'Classical', country: 'Country', dance: 'Dance',
                      deep_house: 'Deep House', devotional: 'Devotional', electronic: 'Electronic',
                      experimental: 'Experimental', gospel: 'Gospel', hard_rock: 'Hard Rock',
                      hip_hop: 'Hip-Hop', house: 'House', indie: 'Indie',
                      instrumental: 'Instrumental', jazz: 'Jazz', jungle: 'Jungle',
                      k_pop: 'K-Pop', kids_and_family: 'Kids & Family', latin: 'Latin',
                      lo_fi: 'Lofi', metal: 'Metal', musica_mexicana: 'Musica Mexicana',
                      musica_tropical: 'Musica Tropical', podcasts: 'Podcasts', pop: 'Pop',
                      pop_latino: 'Pop Latino', punk: 'Punk', r_and_b: 'R&B',
                      reggae: 'Reggae', reggaeton: 'Reggaeton', salsa: 'Salsa',
                      samples: 'Samples', soul_funk: 'Soul/Funk', soundbath: 'Soundbath',
                      soundtrack: 'Soundtrack', spoken: 'Spoken', urban_latino: 'Urban Latino',
                      world: 'World', techno: 'Techno',
                    }

                    // Build pills dynamically from backend genre counts
                    const genrePills: { label: string; value: string; count: number }[] = []
                    let totalTracks = 0
                    if (genreCountsData?.exploreGenreCounts) {
                      for (const gc of genreCountsData.exploreGenreCounts) {
                        genrePills.push({
                          label: GENRE_LABELS[gc.genre] || gc.genre.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                          value: gc.genre, // lowercase enum value as stored in DB
                          count: gc.count,
                        })
                        totalTracks += gc.count
                      }
                    }

                    return (
                      <>
                        {/* "All" pill */}
                        <button
                          onClick={() => setExploreGenreFilter(null)}
                          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            !exploreGenreFilter
                              ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                              : 'bg-white/10 text-gray-200 ring-1 ring-white/15 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          All{totalTracks > 0 ? ` ${totalTracks}` : ''}
                        </button>
                        {/* Genre pills sorted by count (most tracks first) */}
                        {genrePills.map((g) => (
                          <button
                            key={g.value}
                            onClick={() => setExploreGenreFilter(g.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                              exploreGenreFilter === g.value
                                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                                : 'bg-white/10 text-gray-200 ring-1 ring-white/15 hover:bg-white/20 hover:text-white'
                            }`}
                          >
                            {g.label} {g.count}
                          </button>
                        ))}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Quick Nav Row */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => router.push('/dex/marketplace')} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15 transition-all">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-[10px] text-gray-200">Shop</span>
                </button>
                <button onClick={() => router.push('/radio')} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15 transition-all">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] text-gray-200">Radio</span>
                </button>
                <button onClick={() => router.push('/dex/users')} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15 transition-all">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span className="text-[10px] text-gray-200">Users</span>
                </button>
                <button onClick={() => router.push('/dex/playlist')} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15 transition-all">
                  <Music className="w-5 h-5 text-purple-400" />
                  <span className="text-[10px] text-gray-200">Playlists</span>
                </button>
              </div>

              {/* New Users - compact avatar row */}
              {((exploreUsersData?.exploreUsers?.nodes?.length ?? 0) > 0 || atlasAgents.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">New Users</h3>
                    <button onClick={() => router.push('/dex/users')} className="text-xs text-cyan-400 hover:text-cyan-300">See all</button>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-3 min-w-max pb-1">
                      {[...(exploreUsersData?.exploreUsers?.nodes || []), ...atlasAgents]
                        ?.filter((p: any, i: number, self: any[]) => p.userHandle && self.findIndex((u: any) => u.id === p.id) === i)
                        ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        ?.slice(0, 20)
                        ?.map((profile: any) => (
                        <Link key={profile.id} href={`/dex/users/${profile.userHandle}`}>
                          <div className="flex flex-col items-center gap-1 w-14">
                            <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-cyan-500/50 transition-all">
                              {profile.profilePicture ? (
                                <img src={profile.profilePicture} alt={profile.displayName} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                  {(profile.displayName || profile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 truncate w-full text-center">@{profile.userHandle}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tracks — NFT Collection + SCid Directory (Sequencer Agent) */}
              {(() => {
                const allTracksRaw = exploreTracksData?.exploreTracks?.nodes || []
                const allTracks = exploreGenreFilter
                  ? allTracksRaw.filter((t: any) => t.genres?.includes(exploreGenreFilter))
                  : allTracksRaw
                const totalTracksCount = exploreGenreFilter
                  ? allTracks.length
                  : (exploreTracksData?.exploreTracks?.pageInfo?.totalCount || allTracks.length)

                // Split into NFT vs SCid
                const nftTracksRaw = allTracks.filter((t: any) => t.nftData?.tokenId || t.nftData?.contract)
                const scidTracks = allTracks.filter((t: any) => !t.nftData?.tokenId && !t.nftData?.contract)

                // Deduplicate NFT tracks by trackEditionId — collapse editions into single pills
                // Each unique edition shows once with an edition badge (×15, ×200, etc.)
                const nftTracks: any[] = []
                const seenEditions = new Set<string>()
                for (const t of nftTracksRaw) {
                  const edKey = t.trackEditionId || t.id // fallback to id if no editionId
                  if (!seenEditions.has(edKey)) {
                    seenEditions.add(edKey)
                    nftTracks.push(t)
                  }
                }

                // Sort by createdAt ascending (oldest = #1), display newest first (reverse)
                const sortedNfts = [...nftTracks].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                const sortedScids = [...scidTracks].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

                const renderTrackPill = (track: any, seqNum: number, sectionTracks: any[]) => {
                  const isCurrentTrack = currentSong.trackId === track.id
                  const isTrackPlaying = isPlaying && isCurrentTrack
                  const coverArt = track.artworkUrl || '/default-pictures/album-artwork.png'
                  const artistName = track.artist || 'Unknown'
                  const editions = track.editionSize && track.editionSize > 1 ? track.editionSize : null

                  return (
                    <div
                      key={track.id}
                      data-track-pill
                      data-pill-id={track.id}
                      className={`group flex items-center gap-1.5 pr-2.5 rounded-full cursor-pointer transition-colors ${
                        isTrackPlaying
                          ? 'bg-cyan-500/25 ring-2 ring-cyan-400/60 shadow-lg shadow-cyan-500/25'
                          : 'bg-white/20 ring-1 ring-white/20 hover:bg-white/30 hover:ring-cyan-400/40'
                      }`}
                      onClick={() => {
                        if (isCurrentTrack) { togglePlay() }
                        else {
                          const trackIdx = sectionTracks.findIndex((t: any) => t.id === track.id)
                          const playlist: Song[] = sectionTracks.map((t: any) => ({
                            trackId: t.id, src: t.playbackUrl || t.assetUrl || '',
                            title: t.title || 'Untitled', artist: t.artist || 'Unknown',
                            art: t.artworkUrl || '', isFavorite: t.isFavorite,
                          }))
                          playlistState(playlist, trackIdx >= 0 ? trackIdx : 0)
                        }
                      }}
                    >
                      <span className="text-[8px] font-mono text-cyan-400 pl-2 flex-shrink-0">#{seqNum}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
                        <img src={coverArt} alt="" className="w-full h-full object-cover" loading="lazy" />
                        {isTrackPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 py-1">
                        <p className="text-[10px] text-white font-semibold truncate max-w-[100px] leading-tight drop-shadow-sm">{track.title || 'Untitled'}</p>
                        <p className="text-[8px] text-gray-300 truncate max-w-[100px] leading-tight">{artistName}</p>
                      </div>
                      {editions && (
                        <span className="text-[7px] font-mono text-purple-300 bg-purple-500/20 px-1 rounded-full flex-shrink-0">{editions}/{editions}</span>
                      )}
                      {isTrackPlaying ? (
                        <Pause className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <Play className="w-3 h-3 text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  )
                }

                const loadMoreTracks = async () => {
                  if (!exploreTracksData?.exploreTracks?.pageInfo?.hasNextPage) return
                  try {
                    await fetchMoreExploreTracks({
                      variables: { page: { first: 200, after: exploreTracksData.exploreTracks.pageInfo.endCursor } },
                      updateQuery: (prev: any, { fetchMoreResult }: any) => {
                        if (!fetchMoreResult) return prev
                        const existingIds = new Set(prev.exploreTracks?.nodes?.map((n: any) => n.id) || [])
                        const newNodes = fetchMoreResult.exploreTracks?.nodes?.filter((n: any) => !existingIds.has(n.id)) || []
                        return {
                          ...fetchMoreResult,
                          exploreTracks: {
                            ...fetchMoreResult.exploreTracks,
                            nodes: [...(prev.exploreTracks?.nodes || []), ...newNodes],
                          },
                        }
                      },
                    })
                  } catch (e) { console.error('Failed to load more tracks:', e) }
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        {exploreSearchQuery ? `Results for "${exploreSearchQuery}"` : 'Discover Tracks'}
                        {exploreSearchQuery && (
                          <button
                            onClick={async () => {
                              const shareUrl = `${window.location.origin}/dex/explore?q=${encodeURIComponent(exploreSearchQuery)}`
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: `${exploreSearchQuery} on SoundChain`, text: `Check out ${exploreSearchQuery} tracks on SoundChain`, url: shareUrl })
                                } catch { /* user cancelled */ }
                              } else {
                                await navigator.clipboard.writeText(shareUrl)
                                toast.success(`${exploreSearchQuery} link copied!`)
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/10 text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300 ring-1 ring-white/10 transition-all"
                            title={`Share ${exploreSearchQuery}`}
                          >
                            <Share2 className="w-3 h-3" />
                            Share
                          </button>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {nftTracks.length + scidTracks.length} unique tracks
                        {nftTracksRaw.length > nftTracks.length
                          ? ` (${nftTracksRaw.length} editions collapsed)`
                          : ''}
                      </span>
                    </div>

                    {exploreTracksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                      </div>
                    ) : allTracks.length > 0 ? (
                      <div className="space-y-4">
                        {/* NFT Collection */}
                        {sortedNfts.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">NFT Collection</span>
                              <span className="text-[10px] text-gray-500">
                                {nftTracks.length} unique{nftTracksRaw.length > nftTracks.length ? ` · ${nftTracksRaw.length} total on-chain` : ' minted'}
                              </span>
                            </div>
                            <div className="relative overflow-hidden rounded-xl bg-black/80 p-3 min-h-[80px]">
                              <div className="relative z-[2] flex flex-wrap gap-1.5 relative">
                                <PillConnectorCanvas
                                  genreFilter={null}
                                  sortedUserIds={sortedNfts.map((t: any) => t.id)}
                                  expandedPillId={null}
                                  alwaysActive
                                />
                                {sortedNfts.map((track: any, i: number) =>
                                  renderTrackPill(track, nftTracks.length - i, sortedNfts)
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SCid Directory */}
                        {sortedScids.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">SCid Directory</span>
                              <span className="text-[10px] text-gray-500">{scidTracks.length} uploaded</span>
                            </div>
                            <div className="relative overflow-hidden rounded-xl bg-black/80 p-3 min-h-[80px]">
                              <div className="relative z-[2] flex flex-wrap gap-1.5 relative">
                                <PillConnectorCanvas
                                  genreFilter={null}
                                  sortedUserIds={sortedScids.map((t: any) => t.id)}
                                  expandedPillId={null}
                                  alwaysActive
                                />
                                {sortedScids.map((track: any, i: number) =>
                                  renderTrackPill(track, scidTracks.length - i, sortedScids)
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Infinite scroll sentinel */}
                        {exploreTracksData?.exploreTracks?.pageInfo?.hasNextPage && (
                          <InfiniteScrollSentinel onIntersect={loadMoreTracks} />
                        )}
                      </div>
                    ) : !exploreTracksLoading && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {exploreSearchQuery ? 'No tracks found' : 'Loading tracks...'}
                      </div>
                    )}
                  </div>
                )
              })()}
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
                  <p className="text-xs text-gray-400">My Collection</p>
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
                          await toggleFavorite({ variables: { trackId: track.id }, refetchQueries: ['FavoriteTracks'] })
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
                  <h2 className="retro-title text-xl">My Collection</h2>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">{ownedTracksData?.groupedTracks?.nodes?.length || 0}</Badge>
                  {ownedTracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Loading...</Badge>}
                </div>
                {ownedTracksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-400">Loading collection...</span>
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
                        onTrackClick={(trackId) => {
                          const t = ownedTracksData?.groupedTracks?.nodes?.find((n: any) => n.id === trackId)
                          if (t) setListNFTModalTrack(t)
                          else router.push(`/dex/track/${trackId}`)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No tracks collected yet</p>
                    <Button onClick={() => setSelectedView('marketplace')} className="mt-4 retro-button">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  </div>
                )}
                {(ownedTracksData?.groupedTracks?.nodes?.length ?? 0) > 12 && (
                  <Button variant="ghost" className="w-full mt-4 hover:bg-purple-500/10 text-purple-400" onClick={() => setSelectedView('wallet')}>
                    View All {ownedTracksData?.groupedTracks?.nodes?.length} Tracks
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
          {selectedView === 'playlist' && (() => {
            const allPlaylists = playlistsData?.getUserPlaylists?.nodes || []

            // Filter by search
            const filteredPlaylists = playlistSearch
              ? allPlaylists.filter((p: any) =>
                  p.title?.toLowerCase().includes(playlistSearch.toLowerCase()) ||
                  p.description?.toLowerCase().includes(playlistSearch.toLowerCase())
                )
              : allPlaylists

            // Sort
            const sortedPlaylists = [...filteredPlaylists].sort((a: any, b: any) => {
              switch (playlistSort) {
                case 'name': return (a.title || '').localeCompare(b.title || '')
                case 'tracks': return (b.tracks?.nodes?.length || 0) - (a.tracks?.nodes?.length || 0)
                case 'favorites': return (b.favoriteCount || 0) - (a.favoriteCount || 0)
                default: return 0 // 'recent' — already in creation order from API
              }
            })

            return (
            <div className="space-y-4">
              {/* Header */}
              <Card className="retro-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <ListMusic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="retro-title text-xl">My Playlists</h2>
                      <p className="text-gray-500 text-xs font-mono">{allPlaylists.length} collections</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="retro-button bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </div>

                {/* Search + Sort + View Toggle */}
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      value={playlistSearch}
                      onChange={(e) => setPlaylistSearch(e.target.value)}
                      placeholder="Search playlists..."
                      className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <select
                    value={playlistSort}
                    onChange={(e) => setPlaylistSort(e.target.value as any)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg text-gray-400 text-xs px-2 py-2 focus:outline-none focus:border-cyan-500/50 font-mono"
                  >
                    <option value="recent">Recent</option>
                    <option value="name">A-Z</option>
                    <option value="tracks">Tracks</option>
                    <option value="favorites">Likes</option>
                  </select>

                  {/* View toggle */}
                  <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setPlaylistViewMode('grid')}
                      className={`p-2 transition-colors ${playlistViewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPlaylistViewMode('list')}
                      className={`p-2 transition-colors ${playlistViewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>

              {/* Playlists */}
              {playlistsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-neutral-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : sortedPlaylists.length > 0 ? (
                <>
                  {/* List view */}
                  {playlistViewMode === 'list' ? (
                    <div className="space-y-1">
                      {sortedPlaylists.map((playlist: any) => (
                        <PlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                          onSelect={(p: any) => setSelectedPlaylist(p)}
                          compact
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Mobile: compact list */}
                      <div className="sm:hidden space-y-1">
                        {sortedPlaylists.map((playlist: any) => (
                          <PlaylistCard
                            key={playlist.id}
                            playlist={playlist}
                            onSelect={(p: any) => setSelectedPlaylist(p)}
                            compact
                          />
                        ))}
                      </div>
                      {/* Desktop: grid */}
                      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedPlaylists.map((playlist: any) => (
                          <PlaylistCard
                            key={playlist.id}
                            playlist={playlist}
                            onSelect={(p: any) => setSelectedPlaylist(p)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Results count when searching */}
                  {playlistSearch && (
                    <p className="text-center text-gray-600 text-xs font-mono">
                      {sortedPlaylists.length} of {allPlaylists.length} playlists
                    </p>
                  )}
                </>
              ) : playlistSearch ? (
                <Card className="retro-card p-8 text-center">
                  <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No playlists match "{playlistSearch}"</p>
                  <button onClick={() => setPlaylistSearch('')} className="mt-3 text-cyan-400 text-sm hover:text-cyan-300">Clear search</button>
                </Card>
              ) : (
                <Card className="retro-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
                    <ListMusic className="w-8 h-8 text-cyan-500/30" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">No playlists yet</h3>
                  <p className="text-gray-500 text-sm mb-6 font-mono">Create your first playlist to start curating</p>
                  <Button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="retro-button bg-gradient-to-r from-pink-500 to-purple-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                  </Button>
                </Card>
              )}
            </div>
            )
          })()}

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
            <MultiChainProvider walletAddress={userWallet}>
            <div className="space-y-4">

              {/* Multi-Wallet Aggregator - Primary wallet display */}
              <MultiWalletAggregator
                userWallet={userWallet}
                maticBalance={activeBalance || maticBalance}
                ogunBalance={activeOgunBalance || ogunBalance}
                ownedTracks={ownedTracks}
                onPlayTrack={(track, index) => handlePlayTrack(track, index, ownedTracks)}
                onTrackClick={(trackId) => {
                  const t = ownedTracks?.find((n: any) => n.id === trackId)
                  if (t) setListNFTModalTrack(t)
                  else router.push(`/dex/track/${trackId}`)
                }}
                currentTrackId={currentSong?.trackId}
                isPlaying={isPlaying}
                openWeb3Modal={openWeb3Modal}
              />

              {/* Quick Stats + Links */}
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">OGUN</span>
                      <p className="text-yellow-400 font-mono">{(Number(ogunBalance || 0) + Number(stakedOgunBalance || 0)).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">POL</span>
                      <p className="text-purple-400 font-mono">{activeBalance || maticBalance || '0.00'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Collection</span>
                      <p className="text-cyan-400 font-mono">{(ownedTracksLoading || legacyOwnedTracksLoading) ? '...' : ownedTracks.length}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wide">VALUE</span>
                      <p className="text-green-400 font-mono">${maticUsdData?.maticUsd ? (Number(activeBalance || maticBalance || 0) * Number(maticUsdData.maticUsd)).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(activeAddress || walletAccount) && (
                      <a
                        href={`https://polygonscan.com/address/${activeAddress || walletAccount}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="View on Polygonscan"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                      </a>
                    )}
                    {activeWalletType === 'web3modal' && (
                      <button
                        onClick={unifiedDisconnectWallet}
                        className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Slim Action Buttons */}
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-3 flex items-center gap-2 mb-6">
                <button
                  onClick={() => document.getElementById('buy-crypto-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded text-sm font-medium text-white transition-all"
                >
                  Buy
                </button>
                <button
                  onClick={() => document.getElementById('transfer-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-white transition-all"
                >
                  Send
                </button>
                <button
                  onClick={() => {
                    if (userWallet) {
                      navigator.clipboard.writeText(userWallet)
                      alert(`Wallet address copied:\n${userWallet}`)
                    }
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-white transition-all"
                >
                  Receive
                </button>
                <button
                  onClick={() => document.getElementById('swap-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-white transition-all"
                >
                  Swap
                </button>
                <button
                  onClick={() => setShowSweepPanel(!showSweepPanel)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-white transition-all"
                >
                  Sweep
                </button>
              </div>

              {/* Sweep Panel */}
              {showSweepPanel && (
                <div id="sweep-section" className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <h3 className="retro-title text-lg">Batch Transfer</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSweepPanel(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Select tracks to batch transfer to another wallet.</p>

                  {/* From Wallet Indicator - uses same selection as Token Transfer */}
                  <div className="mb-4 p-2 bg-black/30 rounded-lg border border-gray-700">
                    <span className="text-xs text-gray-500">From: </span>
                    <span className="text-orange-400 font-mono text-xs">
                      {(() => {
                        const addr = resolveWalletAddress(transferSourceWallet)
                        const label = transferSourceWallet === 'hd' ? 'HD Wallet' :
                                      transferSourceWallet === 'legacy' ? 'Legacy OAuth' :
                                      transferSourceWallet === 'oauth' ? 'OAuth' :
                                      connectedExternalWallets?.find(w => w.address.toLowerCase() === transferSourceWallet.toLowerCase())?.walletType || 'External'
                        return `${label} (${addr?.slice(0, 6)}...${addr?.slice(-4)})`
                      })()}
                    </span>
                  </div>

                  {/* Recipient Address */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs mb-1 block">Recipient Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={sweepRecipient}
                      onChange={(e) => setSweepRecipient(e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500/50 focus:outline-none"
                      disabled={sweeping}
                    />
                  </div>

                  {/* Select All / Deselect All */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-xs">{sweepSelectedIds.size} track{sweepSelectedIds.size !== 1 ? 's' : ''} selected</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllForSweep} disabled={sweeping} className="text-orange-400 text-xs">
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllForSweep} disabled={sweeping} className="text-gray-400 text-xs">
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  {/* NFT Grid with Checkboxes */}
                  <div className="max-h-64 overflow-y-auto mb-4 space-y-1">
                    {ownedTracks.filter((t: any) => t.nftData?.tokenId || t.tokenId).length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No tracks with on-chain token IDs found</p>
                    ) : (
                      ownedTracks
                        .filter((t: any) => t.nftData?.tokenId || t.tokenId)
                        .map((track: any) => (
                          <div
                            key={track.id}
                            onClick={() => !sweeping && toggleSweepSelect(track.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                              sweepSelectedIds.has(track.id)
                                ? 'bg-orange-500/15 border border-orange-500/40'
                                : 'bg-black/20 border border-transparent hover:border-gray-700'
                            } ${sweeping ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              sweepSelectedIds.has(track.id)
                                ? 'border-orange-400 bg-orange-500/30'
                                : 'border-gray-600'
                            }`}>
                              {sweepSelectedIds.has(track.id) && (
                                <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {track.artworkUrl ? (
                              <img src={track.artworkUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-800 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{track.title || 'Untitled'}</p>
                              <p className="text-gray-500 text-xs truncate">Token #{track.nftData?.tokenId || track.tokenId}</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Sweep Progress */}
                  {sweeping && sweepProgress.total > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Transferring...</span>
                        <span>{sweepProgress.current}/{sweepProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${(sweepProgress.current / sweepProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Sweep Action Button */}
                  <Button
                    className="w-full retro-button bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300"
                    disabled={sweeping || sweepSelectedIds.size === 0 || !sweepRecipient || !(resolveWalletAddress(transferSourceWallet))}
                    onClick={handleSweep}
                  >
                    {sweeping
                      ? `Sweeping ${sweepProgress.current}/${sweepProgress.total}...`
                      : `Transfer ${sweepSelectedIds.size} Track${sweepSelectedIds.size !== 1 ? 's' : ''}`
                    }
                  </Button>
                </div>
              )}

              {/* Slim Buy/Bridge Links */}
              <div id="buy-crypto-section" className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Get POL:</span>
                  <div className="flex items-center gap-3">
                    <a href="https://ramp.network/" target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300">Ramp</a>
                    <a href="https://www.moonpay.com/" target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300">MoonPay</a>
                    <a href="https://wallet.polygon.technology/" target="_blank" rel="noreferrer" className="text-xs text-orange-400 hover:text-orange-300">Bridge</a>
                    <a href="https://www.coinbase.com/" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">Coinbase</a>
                  </div>
                </div>
              </div>

              {/* Slim Swap Link */}
              <div id="swap-section" className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Swap:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-yellow-400">Coming Soon - ZetaChain</span>
                    <a href="https://www.zetachain.com" target="_blank" rel="noreferrer" className="text-xs text-green-400 hover:text-green-300">Learn More</a>
                  </div>
                </div>
              </div>

              {/* NFT Collection is rendered inside MultiWalletAggregator above */}

              {/* Transfer Tokens Section */}
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-white">Send Tokens</h3>
                </div>

                {/* From Wallet Selector */}
                <div className="mb-4 p-3 bg-black/30 rounded-lg border border-gray-700">
                  <label className="text-xs text-gray-500 mb-2 block">From Wallet</label>
                  <select
                    value={transferSourceWallet}
                    onChange={(e) => setTransferSourceWallet(e.target.value as 'oauth' | 'hd' | 'legacy' | string)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-cyan-400 font-mono text-sm focus:border-cyan-500 focus:outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    {/* HD Wallet Option (if upgraded) */}
                    {userData?.me?.hdWalletAddress && (
                      <option value="hd" className="bg-gray-900 text-cyan-400">
                        HD Wallet: {userData.me.hdWalletAddress.slice(0, 6)}...{userData.me.hdWalletAddress.slice(-4)} (Multi-Chain)
                      </option>
                    )}
                    {/* Legacy OAuth Wallet Option (separate from HD — for migration) */}
                    {userData?.me?.hdWalletAddress && (() => {
                      const legacyAddr = userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress
                      return legacyAddr && legacyAddr.toLowerCase() !== userData?.me?.hdWalletAddress?.toLowerCase() ? (
                        <option value="legacy" className="bg-gray-900 text-yellow-400">
                          OAuth Wallet: {legacyAddr.slice(0, 6)}...{legacyAddr.slice(-4)} (has POL)
                        </option>
                      ) : null
                    })()}
                    {/* OAuth Wallet Option (for users who haven't upgraded to HD) */}
                    {!userData?.me?.hdWalletAddress && userWallet && (
                      <option value="oauth" className="bg-gray-900 text-cyan-400">
                        SoundChain OAuth: {userWallet.slice(0, 6)}...{userWallet.slice(-4)} ({parseFloat(maticBalance || '0').toFixed(4)} POL)
                      </option>
                    )}
                    {/* External Wallets from UnifiedWallet Context */}
                    {connectedExternalWallets?.map((wallet) => (
                      <option key={wallet.address} value={wallet.address} className="bg-gray-900 text-purple-400">
                        {wallet.walletType}: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} ({parseFloat(wallet.balance || '0').toFixed(4)} POL)
                      </option>
                    ))}
                  </select>
                  {/* Show selected wallet full address */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-400 font-mono text-xs break-all">
                      {transferSourceWallet === 'hd' ? userData?.me?.hdWalletAddress :
                       transferSourceWallet === 'legacy' ? (userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress) :
                       resolveWalletAddress(transferSourceWallet)}
                    </span>
                    <button
                      onClick={() => {
                        const addr = transferSourceWallet === 'hd' ? userData?.me?.hdWalletAddress :
                                     transferSourceWallet === 'legacy' ? (userData?.me?.magicWalletAddress || userData?.me?.googleWalletAddress || userData?.me?.discordWalletAddress || userData?.me?.twitchWalletAddress || userData?.me?.emailWalletAddress) :
                                     resolveWalletAddress(transferSourceWallet)
                        if (addr) {
                          navigator.clipboard.writeText(addr)
                          toast.success('Address copied!')
                        }
                      }}
                      className="text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Token Type Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTokenTransferType('POL')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                      tokenTransferType === 'POL'
                        ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                        : 'bg-black/30 border border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    POL
                  </button>
                  <button
                    onClick={() => setTokenTransferType('OGUN')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                      tokenTransferType === 'OGUN'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                        : 'bg-black/30 border border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    OGUN
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Recipient */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Recipient Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={tokenRecipient}
                      onChange={(e) => setTokenRecipient(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">
                      Amount ({tokenTransferType})
                      <span className="ml-2 text-gray-500">
                        Balance: {(() => {
                          // Get balance for selected wallet
                          if (transferSourceWallet === 'oauth' || transferSourceWallet === 'hd' || transferSourceWallet === 'legacy') {
                            return tokenTransferType === 'POL'
                              ? parseFloat(maticBalance || '0').toFixed(4)
                              : parseFloat(ogunBalance || '0').toFixed(2)
                          } else {
                            const extWallet = connectedExternalWallets?.find(w => w.address.toLowerCase() === transferSourceWallet.toLowerCase())
                            return tokenTransferType === 'POL'
                              ? parseFloat(extWallet?.balance || '0').toFixed(4)
                              : parseFloat(extWallet?.ogunBalance || '0').toFixed(2)
                          }
                        })()}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none pr-16"
                        min="0"
                        step="any"
                      />
                      <button
                        onClick={() => {
                          // Get balance for selected wallet
                          let walletBal: string
                          if (transferSourceWallet === 'oauth' || transferSourceWallet === 'hd' || transferSourceWallet === 'legacy') {
                            walletBal = tokenTransferType === 'POL'
                              ? (parseFloat(maticBalance || '0') - 0.01).toFixed(6)
                              : parseFloat(ogunBalance || '0').toString()
                          } else {
                            const extWallet = connectedExternalWallets?.find(w => w.address.toLowerCase() === transferSourceWallet.toLowerCase())
                            walletBal = tokenTransferType === 'POL'
                              ? (parseFloat(extWallet?.balance || '0') - 0.01).toFixed(6)
                              : parseFloat(extWallet?.ogunBalance || '0').toString()
                          }
                          setTransferAmount(parseFloat(walletBal) > 0 ? walletBal : '0')
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-all"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Send Button */}
                  <Button
                    variant="outline"
                    className={`w-full ${
                      tokenTransferType === 'POL'
                        ? 'border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400'
                        : 'border-purple-500/50 hover:bg-purple-500/10 text-purple-400'
                    }`}
                    disabled={!resolveWalletAddress(transferSourceWallet) || !tokenRecipient || !transferAmount || isTransferringToken}
                    onClick={handleTransferToken}
                  >
                    {isTransferringToken ? (
                      <>
                        <div className={`animate-spin w-4 h-4 border-2 ${tokenTransferType === 'POL' ? 'border-cyan-400' : 'border-purple-400'} border-t-transparent rounded-full mr-2`} />
                        Sending {tokenTransferType}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Send {transferAmount || '0'} {tokenTransferType}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Transfer NFTs Section */}
              <div id="transfer-section" className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-white">Transfer Track</h3>
                </div>

                {/* From Wallet Indicator - uses same selection as Token Transfer */}
                <div className="mb-4 p-2 bg-black/30 rounded-lg border border-gray-700">
                  <span className="text-xs text-gray-500">From: </span>
                  <span className="text-purple-400 font-mono text-xs">
                    {transferSourceWallet === 'oauth'
                      ? `OAuth (${userWallet?.slice(0, 6)}...${userWallet?.slice(-4)})`
                      : `${connectedExternalWallets?.find(w => w.address.toLowerCase() === transferSourceWallet.toLowerCase())?.walletType || 'External'} (${transferSourceWallet.slice(0, 6)}...${transferSourceWallet.slice(-4)})`
                    }
                  </span>
                </div>

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
                    <label className="text-xs text-gray-400 mb-2 block">Select Track</label>
                    <select
                      value={selectedNftId}
                      onChange={(e) => setSelectedNftId(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-3 text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Select a track to transfer</option>
                      {ownedTracks.map((track) => (
                        <option key={track.id} value={track.id}>{track.title} - {track.artist}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-purple-500/50 hover:bg-purple-500/10 text-purple-400"
                    disabled={!(resolveWalletAddress(transferSourceWallet)) || !transferRecipient || !selectedNftId || transferring}
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
                        Transfer Track
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Transaction History - Real Data */}
              <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-medium text-white">Recent Activity</h3>
                  </div>
                  {effectiveWalletForActivity && (
                    <a href={`https://polygonscan.com/address/${effectiveWalletForActivity}`} target="_blank" rel="noreferrer">
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
                      const isIncoming = allMyAddresses.has(tx.to?.toLowerCase() || '')
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
              </div>
            </div>
            </MultiChainProvider>
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
              {routeId === 'notifications' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Notifications</h2>
                  </div>
                  <NotificationSettingsForm
                    afterSubmit={() => router.push('/dex/settings')}
                    initialValues={{
                      phoneNumber: userData?.me?.phoneNumber,
                      notifyOnFollow: userData?.me?.notifyOnFollow,
                      notifyOnLike: userData?.me?.notifyOnLike,
                      notifyOnComment: userData?.me?.notifyOnComment,
                      notifyOnSale: userData?.me?.notifyOnSale,
                      notifyOnTip: userData?.me?.notifyOnTip,
                      notifyOnDM: userData?.me?.notifyOnDM,
                      nostrPubkey: userData?.me?.nostrPubkey,
                      notifyViaNostr: userData?.me?.notifyViaNostr,
                    }}
                  />
                </Card>
              )}
              {routeId === 'username' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Edit Username</h2>
                  </div>
                  <HandleForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Username" />
                </Card>
              )}
              {routeId === 'display-name' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Edit Display Name</h2>
                  </div>
                  <DisplayNameForm afterSubmit={() => router.push('/dex/settings')} submitText="Save Name" />
                </Card>
              )}
              {routeId === 'profile-song' && (
                <Card className="retro-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Link href="/dex/settings" className="text-cyan-400 hover:text-cyan-300">← Back</Link>
                    <h2 className="retro-title text-xl">Profile Song</h2>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Choose which track auto-plays when others visit your profile. You can pick an NFT track or wall-uploaded audio.</p>
                  {((viewingProfile as any)?.featuredTrackId || (viewingProfile as any)?.featuredAudioUrl) && (
                    <div className="flex items-center gap-2 mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-amber-400">
                        Current: {(viewingProfile as any)?.featuredTrackId
                          ? viewingProfileNFTs.find((t: any) => t.id === (viewingProfile as any)?.featuredTrackId)?.title || 'Selected track'
                          : (viewingProfile as any)?.featuredAudioTitle || 'Wall Audio'}
                      </span>
                      <button
                        onClick={async () => {
                          await updateFeaturedTrack({ variables: { input: { featuredTrackId: '', featuredAudioUrl: '', featuredAudioTitle: '', featuredAudioArtist: '', featuredAudioCoverUrl: '' } } })
                          toast.success('Profile song cleared')
                        }}
                        className="ml-auto text-xs text-gray-500 hover:text-red-400"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  {viewingProfileNFTs.length > 0 && (
                    <p className="text-gray-500 text-xs mb-2 font-semibold uppercase tracking-wider">NFT Tracks</p>
                  )}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {viewingProfileNFTs.map((track: any) => {
                      const isSelected = (viewingProfile as any)?.featuredTrackId === track.id
                      return (
                        <button
                          key={track.id}
                          onClick={async () => {
                            await updateFeaturedTrack({ variables: { input: { featuredTrackId: track.id, featuredAudioUrl: '', featuredAudioTitle: '', featuredAudioArtist: '', featuredAudioCoverUrl: '' } } })
                            toast.success(`Profile song set to "${track.title}"`)
                            router.push('/dex/settings')
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isSelected ? 'bg-amber-500/10 border border-amber-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'}`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            {track.artworkUrl ? (
                              <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-gray-600" /></div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm text-white truncate">{track.title}</p>
                            <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                          </div>
                          {isSelected ? (
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-gray-500 text-xs mt-4 mb-2 font-semibold uppercase tracking-wider">Wall Audio</p>
                  <p className="text-gray-600 text-xs mb-2">Go to your Wall tab and use the "Profile Song" button on any audio post to set it here.</p>
                  {(viewingProfile as any)?.featuredAudioUrl && !(viewingProfile as any)?.featuredTrackId && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/50">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                        {(viewingProfile as any)?.featuredAudioCoverUrl ? (
                          <img src={(viewingProfile as any).featuredAudioCoverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-purple-600"><Music className="w-4 h-4 text-white" /></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-white truncate">{(viewingProfile as any)?.featuredAudioTitle || 'Wall Audio'}</p>
                        <p className="text-xs text-gray-500 truncate">{(viewingProfile as any)?.featuredAudioArtist}</p>
                      </div>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    </div>
                  )}
                  {!viewingProfileNFTs.length && !(viewingProfile as any)?.featuredAudioUrl && (
                    <div className="text-center py-8 text-gray-500 text-sm">Upload tracks or post audio to your wall to set a profile song</div>
                  )}
                </Card>
              )}
              {/* Main settings menu - show when no sub-route */}
              {!routeId && (
                <Card className="retro-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <SettingsIcon className="w-8 h-8 text-gray-400" />
                      <h2 className="retro-title text-xl">Settings</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedView('feed')} className="w-8 h-8 p-0 text-gray-400 hover:text-white hover:bg-cyan-500/20">
                      <X className="w-5 h-5" />
                    </Button>
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
                    <Link href="/dex/settings/display-name">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm">Display Name</h3>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {userData?.me?.profile?.displayName || 'Set your name...'}
                            </p>
                          </div>
                          <span className="text-cyan-400 ml-2">→</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/dex/settings/username">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm">Username</h3>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              @{userData?.me?.handle || 'Set your username...'}
                            </p>
                          </div>
                          <span className="text-cyan-400 ml-2">→</span>
                        </div>
                      </Card>
                    </Link>
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
                    <Link href="/dex/settings/profile-song">
                      <Card className="metadata-section p-4 hover:border-amber-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Profile Song</h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {(viewingProfile as any)?.featuredTrackId
                                ? <span className="text-amber-400">♫ {viewingProfileNFTs.find((t: any) => t.id === (viewingProfile as any)?.featuredTrackId)?.title || 'Set'}</span>
                                : (viewingProfile as any)?.featuredAudioUrl
                                  ? <span className="text-amber-400">♫ {(viewingProfile as any)?.featuredAudioTitle || 'Wall Audio'}</span>
                                  : 'Choose auto-play track'}
                            </p>
                          </div>
                          <span className="text-amber-400">→</span>
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
                    <Link href="/dex/settings/notifications">
                      <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            <p className="text-xs text-gray-400 mt-1">Phone number & push preferences</p>
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

          {/* Messages View - Full DM System (mobile-friendly: list OR chat, not both) */}
          {selectedView === 'messages' && (
            <div className="h-[calc(100vh-200px)] flex flex-col lg:grid lg:grid-cols-3 lg:gap-4">
              {/* Conversations List — hidden on mobile when a chat is selected */}
              <Card className={`retro-card overflow-hidden lg:col-span-1 flex flex-col ${selectedChatId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-bold text-white">Messages</h2>
                    </div>
                    <button
                      onClick={() => refetchChats()}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${chatsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {chatsLoading && !chatsData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                    </div>
                  ) : (chatsData?.chats?.nodes?.length ?? 0) > 0 ? (
                    <div className="divide-y divide-gray-800/50">
                      {chatsData?.chats?.nodes?.map((chat: any) => {
                        const chatProfileId = chat.profile?.id || chat.id
                        const isSelected = selectedChatId === chatProfileId
                        return (
                          <div
                            key={chat.id}
                            onClick={() => setSelectedChatId(chatProfileId)}
                            className={`p-3 cursor-pointer transition-all ${isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="w-11 h-11">
                                  {chat.profile?.profilePicture ? (
                                    <AvatarImage src={chat.profile.profilePicture} />
                                  ) : null}
                                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-sm">
                                    {chat.profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                {chat.unread && (
                                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyan-400 rounded-full border-2 border-black" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`font-medium truncate ${chat.unread ? 'text-white' : 'text-gray-300'}`}>
                                    {chat.profile?.displayName || 'Unknown'}
                                  </p>
                                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                                    {new Date(chat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${chat.unread ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                                  {chat.message || 'No messages yet'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-12">
                      <div className="text-center px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          <MessageCircle className="w-8 h-8 text-cyan-400" />
                        </div>
                        <p className="text-white font-medium mb-1">No conversations yet</p>
                        <p className="text-sm text-gray-500">Visit an artist's profile and tap the message icon to start chatting</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Chat Window — full screen on mobile when selected */}
              <Card className={`retro-card overflow-hidden lg:col-span-2 flex flex-col ${selectedChatId ? 'flex' : 'hidden lg:flex'}`}>
                {selectedChatId ? (
                  <>
                    {/* Chat Header — uses resolved profile from conversations list */}
                    <div className="p-3 border-b border-cyan-500/30 flex items-center gap-3">
                      {/* Back button (mobile only) */}
                      <button
                        onClick={() => setSelectedChatId(null)}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      {selectedChatProfile ? (
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => selectedChatProfile?.userHandle && router.push(`/dex/users/${selectedChatProfile.userHandle}`)}
                        >
                          <Avatar className="w-9 h-9">
                            {(selectedChatProfile as any)?.profilePicture ? (
                              <AvatarImage src={(selectedChatProfile as any).profilePicture} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-xs">
                              {(selectedChatProfile as any)?.displayName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white text-sm">{(selectedChatProfile as any)?.displayName}</p>
                            <p className="text-xs text-gray-500">@{(selectedChatProfile as any)?.userHandle}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Loading...</p>
                        </div>
                      )}
                    </div>

                    {/* Messages — scrollable thread */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatHistoryLoading && !chatHistoryData ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        </div>
                      ) : chatHistoryData?.chatHistory?.nodes?.length ? (
                        <>
                          {chatHistoryData.chatHistory.nodes.map((message: any, idx: number) => {
                            const isMe = message.fromId === user?.id
                            const prevMessage = idx > 0 ? chatHistoryData.chatHistory.nodes[idx - 1] : null
                            const showTimestamp = !prevMessage ||
                              (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000) // 5 min gap
                            return (
                              <React.Fragment key={message.id}>
                                {showTimestamp && (
                                  <div className="flex justify-center py-2">
                                    <span className="text-[10px] text-gray-600 bg-gray-900/50 px-3 py-1 rounded-full">
                                      {new Date(message.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}
                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                    isMe
                                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black'
                                      : 'bg-gray-800/80 text-white border border-gray-700/50'
                                  }`}>
                                    <DmMessageContent text={message.message} isMe={isMe} />
                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-cyan-900/70' : 'text-gray-500'}`}>
                                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </React.Fragment>
                            )
                          })}
                          <div ref={messagesEndRef} />
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center py-12">
                          <div className="text-center">
                            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Start of your conversation</p>
                            <p className="text-xs text-gray-600 mt-1">Say something to break the ice</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-3 border-t border-gray-800/50 bg-black/40">
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
                        className="flex gap-2 items-end"
                      >
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-gray-900/80 border border-gray-700/50 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                          maxLength={1000}
                        />
                        <button
                          type="submit"
                          disabled={!messageInput.trim() || sendingMessage}
                          className="p-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black transition-all flex-shrink-0"
                        >
                          {sendingMessage ? (
                            <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                          )}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <MessageCircle className="w-10 h-10 text-cyan-500/50" />
                      </div>
                      <p className="text-white font-medium mb-1">Your Messages</p>
                      <p className="text-sm text-gray-500">Select a conversation to start chatting</p>
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

          {/* Nearby View - Location-based Bitchat Integration */}
          {selectedView === 'nearby' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Radio className="w-8 h-8 text-green-400" />
                    <div>
                      <h2 className="retro-title text-xl">Nearby</h2>
                      <p className="text-xs text-gray-500">Chat with nearby users via Bitchat & Nostr</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400">Live</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedView('feed'); router.push('/dex/feed', undefined, { shallow: true }); }}
                      className="w-8 h-8 p-0 hover:bg-red-500/20"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
                <ConcertChat showBitchatPromo={true} />
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
                            <span className="text-white">{scidData?.scidByTrack?.streamCount?.toLocaleString() || trackDetailData.track.playbackCountFormatted || '0'} plays</span>
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-400 uppercase tracking-wider">SoundChain ID</p>
                                <BadgeVerifiedOnChain scid={scidData.scidByTrack.scid} compact />
                              </div>
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
                              await toggleFavorite({ variables: { trackId: trackDetailData.track.id }, refetchQueries: ['Track', 'FavoriteTracks'] })
                            }}
                          >
                            <Heart className={`w-4 h-4 mr-2 ${trackDetailData.track.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
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
                              Collect Track
                            </Button>
                          )}
                          {/* List for Sale button - only shown if user owns this NFT */}
                          {trackDetailData.track.nftData?.owner &&
                           allMyAddresses.has(trackDetailData.track.nftData.owner.toLowerCase()) && (
                            <Button
                              className="bg-purple-500 hover:bg-purple-600 text-white font-bold"
                              onClick={() => router.push(`/tracks/${trackDetailData.track.id}/list/buy-now`)}
                            >
                              <Tag className="w-4 h-4 mr-2" />
                              List for Sale
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
                              <span className="text-gray-400 mb-1 md:mb-0">Publisher</span>
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
                              <div className="flex items-center gap-2">
                                {allMyAddresses.has(trackDetailData.track.nftData.owner.toLowerCase()) && (
                                  <Badge className="bg-green-500/20 text-green-400 text-xs">You own this</Badge>
                                )}
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
                            <div className="text-2xl font-bold text-purple-400">{scidData?.scidByTrack?.streamCount || trackDetailData.track.playbackCount || 0}</div>
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

                  {/* Edition Sequencer — shows each NFT in the edition with token ID + owner avatar */}
                  {trackDetailData.track.trackEditionId && (editionTracksData?.tracks?.nodes?.length ?? 0) > 0 && (
                    <Card className="retro-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="retro-title text-lg">Edition Sequencer</h2>
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                            {editionTracksData?.tracks?.nodes?.length || 0}/{trackDetailData.track.editionSize || '?'}
                          </Badge>
                        </div>

                        {editionTracksLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
                            <span className="ml-3 text-gray-400 text-sm">Loading edition...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {/* Header row */}
                            <div className="grid grid-cols-[40px_1fr_1fr_80px] gap-3 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold border-b border-gray-800">
                              <span>#</span>
                              <span>Token ID</span>
                              <span>Owner</span>
                              <span className="text-right">Status</span>
                            </div>

                            {/* Edition rows */}
                            {editionTracksData?.tracks?.nodes?.map((edTrack: any, idx: number) => {
                              const tokenId = edTrack.nftData?.tokenId || edTrack.tokenId
                              const ownerAddr = edTrack.nftData?.owner
                              const ownerProfile = edTrack.profile
                              const isListed = edTrack.listingItem?.price || edTrack.listingItem?.pricePerItem
                              const txHash = edTrack.nftData?.transactionHash
                              const editionTotal = trackDetailData.track.editionSize || editionTracksData?.tracks?.nodes?.length || 1

                              return (
                                <div
                                  key={edTrack.id}
                                  className={`grid grid-cols-[40px_1fr_1fr_80px] gap-3 px-3 py-2.5 rounded-lg transition-colors ${idx % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-900/30'} hover:bg-gray-700/30`}
                                >
                                  {/* Sequence number */}
                                  <span className="text-purple-400 font-bold text-sm tabular-nums">
                                    {idx + 1}/{editionTotal}
                                  </span>

                                  {/* Token ID with Polygonscan link */}
                                  <div className="flex items-center min-w-0">
                                    {txHash ? (
                                      <a
                                        href={`${config.polygonscan}tx/${txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 font-mono text-sm truncate flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        #{tokenId || '—'}
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      </a>
                                    ) : (
                                      <span className="text-cyan-400 font-mono text-sm truncate">#{tokenId || '—'}</span>
                                    )}
                                  </div>

                                  {/* Owner avatar pill */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    {ownerProfile ? (
                                      <Link
                                        href={`/dex/users/${ownerProfile.userHandle || ownerProfile.id}`}
                                        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                                      >
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex-shrink-0 ring-1 ring-purple-500/30">
                                          <img
                                            src={ownerProfile.profilePicture || '/default-pictures/profile/red.png'}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-pictures/profile/red.png' }}
                                          />
                                        </div>
                                        <span className="text-white text-xs truncate">
                                          {ownerProfile.displayName || ownerProfile.userHandle || 'Unknown'}
                                        </span>
                                      </Link>
                                    ) : ownerAddr ? (
                                      <a
                                        href={`${config.polygonscan}address/${ownerAddr}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                                      >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                                          <span className="text-[8px] text-white font-bold">{ownerAddr.slice(2, 4).toUpperCase()}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs font-mono truncate">
                                          {ownerAddr.slice(0, 6)}...{ownerAddr.slice(-4)}
                                        </span>
                                      </a>
                                    ) : (
                                      <span className="text-gray-500 text-xs">No owner data</span>
                                    )}
                                  </div>

                                  {/* Status */}
                                  <div className="text-right">
                                    {isListed ? (
                                      <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1.5">FOR SALE</Badge>
                                    ) : (
                                      <Badge className="bg-gray-700/50 text-gray-400 text-[9px] px-1.5">HELD</Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
                  {/* Cover Image - FULL SCREEN with profile info overlaid at bottom */}
                  <div className="relative h-[40vh] min-h-[250px] w-full overflow-hidden">
                    {viewingProfile.coverPicture ? (
                      <img
                        src={viewingProfile.coverPicture}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/80 via-cyan-900/50 to-black" />
                    )}
                    {/* Gradient overlay - stronger at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Profile Info - Positioned at bottom of cover */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                      <div className="max-w-screen-lg mx-auto">
                        {/* Avatar + Name Row */}
                        <div className="flex items-end gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-3 border-white/20 bg-gradient-to-br from-purple-900 to-cyan-900 shadow-2xl">
                              {viewingProfile.profilePicture ? (
                                <img
                                  src={viewingProfile.profilePicture}
                                  alt={viewingProfile.displayName || 'Profile'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl text-white font-bold">
                                  {(viewingProfile.displayName || viewingProfile.userHandle)?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            {/* Online indicator */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black" />
                          </div>

                          {/* Name + Handle */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                              {viewingProfile.displayName || viewingProfile.userHandle || 'User'}
                            </h1>
                            {viewingProfile.teamMember && (
                              <SoundchainGoldLogo className="flex-shrink-0 w-6 h-6" aria-label="SoundChain Team Member" />
                            )}
                            {!viewingProfile.teamMember && viewingProfile.verified && (
                              <VerifiedIcon className="flex-shrink-0 w-6 h-6" aria-label="Verified user" />
                            )}
                          </div>
                          <p className="text-cyan-400 text-sm">@{viewingProfile.userHandle || 'user'}</p>
                        </div>
                      </div>

                      {/* Bio */}
                      {viewingProfile.bio && (
                        <p className="text-gray-300 text-sm mt-3 max-w-xl">{viewingProfile.bio}</p>
                      )}

                      {/* Social Pills */}
                      {(() => {
                        const sm = viewingProfile.socialMedias
                        if (!sm) return null
                        const entries = Object.entries(sm).filter(([k, v]) => k !== '__typename' && v)
                        if (!entries.length) return null
                        return (
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {entries.map(([k, v]) => (
                              <SocialMediaLink key={k} company={k as keyof typeof sm} handle={String(v)} />
                            ))}
                          </div>
                        )
                      })()}

                      {/* Stats Row - Clickable */}
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-500" />
                          <span className="font-bold text-white">
                            {(viewCountData?.profileViewCount?.total || (viewingProfile as any)?.profileViewCount || 0).toLocaleString()}
                          </span>
                          <span className="text-gray-500">total views</span>
                        </div>
                        <button onClick={() => setProfileStatsModal('tracks')} className="flex items-center gap-1 cursor-pointer hover:text-cyan-400 transition-colors">
                          <span className="font-bold text-white">{viewingProfileTrackCount}</span>
                          <span className="text-gray-500 hover:text-cyan-400">Tracks</span>
                        </button>
                        <button onClick={() => setProfileStatsModal('followers')} className="flex items-center gap-1 cursor-pointer hover:text-cyan-400 transition-colors">
                          <span className="font-bold text-white">{viewingProfile.followerCount?.toLocaleString() || 0}</span>
                          <span className="text-gray-500 hover:text-cyan-400">Followers</span>
                        </button>
                        <button onClick={() => setProfileStatsModal('following')} className="flex items-center gap-1 cursor-pointer hover:text-cyan-400 transition-colors">
                          <span className="font-bold text-white">{viewingProfile.followingCount?.toLocaleString() || 0}</span>
                          <span className="text-gray-500 hover:text-cyan-400">Following</span>
                        </button>
                      </div>

                      {/* Profile Song — MySpace-style auto-play bar */}
                      {(() => {
                        const featuredTrackId = (viewingProfile as any)?.featuredTrackId
                        const featuredAudioUrl = (viewingProfile as any)?.featuredAudioUrl
                        if (!featuredTrackId && !featuredAudioUrl) return null
                        const nftTrack = featuredTrackId ? viewingProfileNFTs.find((t: any) => t.id === featuredTrackId) : null
                        const songTitle = nftTrack?.title || (viewingProfile as any)?.featuredAudioTitle || 'Profile Song'
                        const songArtist = nftTrack?.artist || (viewingProfile as any)?.featuredAudioArtist || viewingProfile.displayName
                        const songArt = nftTrack?.artworkUrl || (viewingProfile as any)?.featuredAudioCoverUrl
                        const songUrl = nftTrack?.playbackUrl || featuredAudioUrl
                        if (!songUrl) return null
                        return (
                          <button
                            onClick={() => {
                              if (nftTrack) {
                                handlePlayTrack(nftTrack, 0, [nftTrack])
                              } else {
                                playlistState([{
                                  trackId: `profile-song-${viewingProfile.id}`,
                                  src: songUrl,
                                  title: songTitle,
                                  artist: songArtist || '',
                                  art: songArt || '',
                                  isFavorite: false,
                                }], 0)
                              }
                            }}
                            className="mt-3 flex items-center gap-3 w-full max-w-sm p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 hover:border-amber-400/60 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                              {songArt ? (
                                <img src={songArt} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-purple-600">
                                  <Music className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm text-white truncate font-medium">{songTitle}</p>
                              <p className="text-[10px] text-amber-400 truncate">Profile Song{songArtist ? ` — ${songArtist}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                              <div className="w-0.5 h-3 bg-amber-400 rounded-full animate-pulse" />
                              <div className="w-0.5 h-4 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                              <div className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                            </div>
                          </button>
                        )
                      })()}

                      {/* Stats Overlay Modal — fixed centered, portal-style */}
                      {profileStatsModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setProfileStatsModal(null)}>
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                          <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-neutral-900 z-10">
                              <h3 className="text-white font-bold text-sm">
                                {profileStatsModal === 'tracks' && `${viewingProfileTrackCount} Tracks`}
                                {profileStatsModal === 'followers' && `${viewingProfile.followerCount?.toLocaleString() || 0} Followers`}
                                {profileStatsModal === 'following' && `${viewingProfile.followingCount?.toLocaleString() || 0} Following`}
                              </h3>
                              <button onClick={() => setProfileStatsModal(null)} className="p-1 hover:bg-white/10 rounded-full">
                                <X className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                            {/* Content — scrollable */}
                            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 52px)' }}>
                              {profileStatsModal === 'tracks' && (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                  {viewingProfileNFTs.map((track: any, idx: number) => (
                                    <button
                                      key={track.id}
                                      onClick={() => { handlePlayTrack(track, idx, viewingProfileNFTs); setProfileStatsModal(null); }}
                                      className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-cyan-400 transition-all"
                                      title={track.title}
                                    >
                                      {track.artworkUrl ? (
                                        <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-gray-600" /></div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Play className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-white truncate">{track.title}</p>
                                      </div>
                                    </button>
                                  ))}
                                  {viewingProfileNFTs.length === 0 && (
                                    <div className="col-span-4 text-center py-8 text-gray-500 text-sm">No tracks yet</div>
                                  )}
                                </div>
                              )}
                              {profileStatsModal === 'followers' && (
                                <>
                                  {viewingFollowersLoading && followersList.length === 0 ? (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-5 gap-3">
                                      {followersList.map((user: any) => (
                                        <button
                                          key={user.id}
                                          onClick={() => { router.push(`/dex/users/${user.userHandle}`); setProfileStatsModal(null); }}
                                          className="flex flex-col items-center gap-1.5 hover:bg-white/5 rounded-xl p-2 transition-colors"
                                        >
                                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-800 ring-2 ring-white/5">
                                            {user.avatar ? (
                                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-gray-400 truncate w-full text-center">{user.name}</span>
                                        </button>
                                      ))}
                                      {followersList.length === 0 && (
                                        <div className="col-span-5 text-center py-8 text-gray-500 text-sm">No followers yet</div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                              {profileStatsModal === 'following' && (
                                <>
                                  {viewingFollowingLoading && followingList.length === 0 ? (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-5 gap-3">
                                      {followingList.map((user: any) => (
                                        <button
                                          key={user.id}
                                          onClick={() => { router.push(`/dex/users/${user.userHandle}`); setProfileStatsModal(null); }}
                                          className="flex flex-col items-center gap-1.5 hover:bg-white/5 rounded-xl p-2 transition-colors"
                                        >
                                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-800 ring-2 ring-white/5">
                                            {user.avatar ? (
                                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-gray-400 truncate w-full text-center">{user.name}</span>
                                        </button>
                                      ))}
                                      {followingList.length === 0 && (
                                        <div className="col-span-5 text-center py-8 text-gray-500 text-sm">No following yet</div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons - Compact row */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        {userLoading ? (
                          <button className="px-4 py-2 text-sm bg-gray-800 rounded-lg opacity-50" disabled>
                            Loading...
                          </button>
                        ) : isViewingOwnProfile ? (
                          <>
                            <button
                              onClick={() => router.push('/dex/settings', undefined, { shallow: false })}
                              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              Edit Profile
                            </button>
                            <button
                              onClick={() => setShowProfileSongPicker(!showProfileSongPicker)}
                              className={`p-2 text-sm rounded-lg transition-colors ${showProfileSongPicker ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-gray-800 hover:bg-gray-700'}`}
                              title="Set Profile Song"
                            >
                              <Music className={`w-4 h-4 ${showProfileSongPicker ? 'text-amber-400' : 'text-gray-400'}`} />
                            </button>
                            <button
                              onClick={() => setShowTopFriendsPicker(!showTopFriendsPicker)}
                              className={`p-2 text-sm rounded-lg transition-colors ${showTopFriendsPicker ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800 hover:bg-gray-700'}`}
                              title="Edit Top 15 Friends"
                            >
                              <Users className={`w-4 h-4 ${showTopFriendsPicker ? 'text-purple-400' : 'text-gray-400'}`} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={async () => {
                              if (!me) { router.push('/login'); return; }
                              if (viewingProfile.isFollowed) {
                                await unfollowProfile({ variables: { input: { followedId: viewingProfile.id } } })
                              } else {
                                await followProfile({ variables: { input: { followedId: viewingProfile.id } } })
                              }
                            }}
                            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                              viewingProfile.isFollowed
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                : 'bg-cyan-500 text-white hover:bg-cyan-600'
                            }`}
                          >
                            <Users className="w-4 h-4" />
                            {viewingProfile.isFollowed ? 'Following' : 'Follow'}
                          </button>
                        )}
                        {!isViewingOwnProfile && (
                          <button
                            onClick={() => { if (!me) { router.push('/login'); return; } setShowDMModal(true); }}
                            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </button>
                        )}
                        {!isViewingOwnProfile && (
                          <button
                            onClick={() => {
                              if (!me) { router.push('/login'); return; }
                              router.push(`/dex/pulse?call=${viewingProfile.id}&name=${encodeURIComponent(viewingProfile.displayName || '')}&avatar=${encodeURIComponent(viewingProfile.profilePicture || '')}`)
                            }}
                            className="p-2 text-sm bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                            title="Voice call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const profileUrl = `${window.location.origin}/profiles/${viewingProfile.userHandle}`
                            if (navigator.share) {
                              try { await navigator.share({ title: viewingProfile.displayName, url: profileUrl }); }
                              catch { navigator.clipboard.writeText(profileUrl); toast.success('Link copied!'); }
                            } else {
                              navigator.clipboard.writeText(profileUrl);
                              toast.success('Link copied!');
                            }
                          }}
                          className="p-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Profile Song Picker Overlay (own profile only) */}
                  {showProfileSongPicker && isViewingOwnProfile && (
                    <div className="px-4 mt-3">
                      <div className="max-w-screen-lg mx-auto">
                        <Card className="p-4 border border-amber-500/30 bg-neutral-900 shadow-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-bold text-amber-400">Set Profile Song</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {((viewingProfile as any)?.featuredTrackId || (viewingProfile as any)?.featuredAudioUrl) && (
                                <button
                                  onClick={async () => {
                                    await updateFeaturedTrack({ variables: { input: { featuredTrackId: '', featuredAudioUrl: '', featuredAudioTitle: '', featuredAudioArtist: '', featuredAudioCoverUrl: '' } } })
                                    toast.success('Profile song cleared')
                                    setShowProfileSongPicker(false)
                                  }}
                                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                              <button onClick={() => setShowProfileSongPicker(false)} className="p-1 hover:bg-white/10 rounded">
                                <X className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          {(viewingProfile as any)?.featuredAudioUrl && !(viewingProfile as any)?.featuredTrackId && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] text-amber-400 truncate">Current: {(viewingProfile as any)?.featuredAudioTitle || 'Wall Audio'}</span>
                            </div>
                          )}
                          <p className="text-gray-500 text-[10px] mb-2 uppercase tracking-wider">NFT Tracks — or use Wall tab &quot;Profile Song&quot; button for wall audio</p>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto">
                            {viewingProfileNFTs.map((track: any) => {
                              const isSelected = (viewingProfile as any)?.featuredTrackId === track.id
                              return (
                                <button
                                  key={track.id}
                                  onClick={async () => {
                                    await updateFeaturedTrack({ variables: { input: { featuredTrackId: track.id, featuredAudioUrl: '', featuredAudioTitle: '', featuredAudioArtist: '', featuredAudioCoverUrl: '' } } })
                                    toast.success(`Profile song set to "${track.title}"`)
                                    setShowProfileSongPicker(false)
                                  }}
                                  className={`group relative aspect-square rounded-lg overflow-hidden bg-gray-800 transition-all ${isSelected ? 'ring-2 ring-amber-400' : 'hover:ring-2 hover:ring-cyan-400'}`}
                                  title={track.title}
                                >
                                  {track.artworkUrl ? (
                                    <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-gray-600" /></div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-1 right-1">
                                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                    <p className="text-[10px] text-white truncate">{track.title}</p>
                                  </div>
                                </button>
                              )
                            })}
                            {viewingProfileNFTs.length === 0 && (
                              <div className="col-span-4 text-center py-6 text-gray-500 text-sm">Upload tracks or use Wall tab &quot;Profile Song&quot; button</div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Top 15 Friends Picker Overlay (own profile only) */}
                  {showTopFriendsPicker && isViewingOwnProfile && (
                    <div className="px-4 mt-3">
                      <div className="max-w-screen-lg mx-auto">
                        <Card className="p-4 border border-purple-500/30 bg-neutral-900 shadow-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-bold text-purple-400">Edit Top 15 Friends</span>
                              <span className="text-xs text-gray-500">({selectedTopFriends.length}/15)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await updateTopFriends({
                                      variables: { input: { topFriends: selectedTopFriends } },
                                      refetchQueries: [
                                        { query: TOP_FRIENDS_PROFILES_QUERY, variables: { profileId: viewingProfile?.id || '' } },
                                        'Me',
                                      ],
                                    })
                                    toast.success('Top friends updated!')
                                    setShowTopFriendsPicker(false)
                                    setTopFriendsSearch('')
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Failed to save top friends')
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                              >
                                Save
                              </button>
                              <button onClick={() => { setShowTopFriendsPicker(false); setTopFriendsSearch('') }} className="p-1 hover:bg-white/10 rounded">
                                <X className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          {/* Search input */}
                          <div className="mb-3 relative">
                            <input
                              type="text"
                              value={topFriendsSearch}
                              onChange={(e) => {
                                const q = e.target.value
                                setTopFriendsSearch(q)
                                if (topFriendsSearchTimer.current) clearTimeout(topFriendsSearchTimer.current)
                                if (q.trim().length >= 1) {
                                  topFriendsSearchTimer.current = setTimeout(() => {
                                    searchExploreUsers({ variables: { search: q.trim(), page: { first: 20 } } })
                                  }, 150)
                                }
                              }}
                              placeholder="Search by name..."
                              className="w-full px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                            />
                            {searchUsersLoading && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 max-h-[40vh] overflow-y-auto">
                            {(() => {
                              const query = topFriendsSearch.trim().toLowerCase()
                              // Local filter from following list
                              const localFiltered = query ? followingList.filter((u: any) => u.name?.toLowerCase().includes(query) || u.userHandle?.toLowerCase().includes(query)) : followingList
                              // Server results (broader than just following)
                              const serverResults = (query.length >= 1 && searchUsersData?.exploreUsers?.nodes) ? searchUsersData.exploreUsers.nodes.map((u: any) => ({
                                id: u.id,
                                name: u.displayName || u.userHandle || '',
                                userHandle: u.userHandle || '',
                                avatar: u.profilePicture || undefined,
                                isVerified: u.verified || u.teamMember || false,
                              })).filter((u: any) => u.id) : []
                              // Merge: deduplicate, prefer entry with avatar
                              const byId = new Map<string, any>()
                              for (const u of localFiltered) byId.set(u.id, u)
                              for (const u of serverResults) {
                                const existing = byId.get(u.id)
                                if (!existing) byId.set(u.id, u)
                                else if (!existing.avatar && u.avatar) byId.set(u.id, { ...existing, avatar: u.avatar })
                              }
                              const merged = Array.from(byId.values())
                              if (merged.length === 0) {
                                return <div className="col-span-5 text-center py-6 text-gray-500 text-sm">{query ? (searchUsersLoading ? 'Searching...' : 'No users found') : 'Follow people to add them as Top Friends'}</div>
                              }
                              return merged.map((user: any) => {
                                const isSelected = selectedTopFriends.includes(user.id)
                                return (
                                  <button
                                    key={user.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedTopFriends(prev => prev.filter(id => id !== user.id))
                                      } else if (selectedTopFriends.length < 15) {
                                        setSelectedTopFriends(prev => [...prev, user.id])
                                      } else {
                                        toast.error('Maximum 15 friends')
                                      }
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isSelected ? 'bg-purple-500/20 ring-2 ring-purple-400' : 'hover:bg-white/5'}`}
                                  >
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-800">
                                      {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                                          <Check className="w-4 h-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{user.name}</span>
                                    {isSelected && (
                                      <span className="text-[9px] text-purple-400 font-bold">#{selectedTopFriends.indexOf(user.id) + 1}</span>
                                    )}
                                  </button>
                                )
                              })
                            })()}
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Top 15 Friends — stacked 2-row grid (7 top, 8 bottom) with drag reorder */}
                  {(() => {
                    const topFriendsProfiles = topFriendsData?.profile?.topFriendsProfiles
                    if (!topFriendsProfiles || topFriendsProfiles.length === 0) return null

                    // Reorder helpers — desktop drag & drop + mobile touch
                    const handleDragStart = (idx: number) => { topFriendsDragIdx.current = idx }
                    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); topFriendsDragOverIdx.current = idx }
                    const handleDrop = async () => {
                      const from = topFriendsDragIdx.current
                      const to = topFriendsDragOverIdx.current
                      if (from === null || to === null || from === to) return
                      const ids = topFriendsProfiles.map((f: any) => f.id)
                      const [moved] = ids.splice(from, 1)
                      ids.splice(to, 0, moved)
                      setSelectedTopFriends(ids)
                      try {
                        await updateTopFriends({
                          variables: { input: { topFriends: ids } },
                          refetchQueries: [
                            { query: TOP_FRIENDS_PROFILES_QUERY, variables: { profileId: viewingProfile?.id || '' } },
                            'Me',
                          ],
                        })
                      } catch { /* silent — will retry on next save */ }
                      topFriendsDragIdx.current = null
                      topFriendsDragOverIdx.current = null
                    }

                    // Mobile touch reorder
                    const handleTouchStart = (idx: number, e: React.TouchEvent) => {
                      if (!topFriendsReorderMode) return
                      topFriendsTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, idx, moved: false }
                    }
                    const handleTouchMove = (e: React.TouchEvent) => {
                      if (!topFriendsReorderMode || topFriendsTouchRef.current.idx === -1) return
                      const dx = Math.abs(e.touches[0].clientX - topFriendsTouchRef.current.x)
                      if (dx > 20) topFriendsTouchRef.current.moved = true
                    }
                    const handleTouchEnd = async (idx: number) => {
                      if (!topFriendsReorderMode || topFriendsTouchRef.current.idx === -1) return
                      if (!topFriendsTouchRef.current.moved) { topFriendsTouchRef.current.idx = -1; return }
                      const from = topFriendsTouchRef.current.idx
                      const to = idx
                      topFriendsTouchRef.current.idx = -1
                      if (from === to) return
                      const ids = topFriendsProfiles.map((f: any) => f.id)
                      const [moved] = ids.splice(from, 1)
                      ids.splice(to, 0, moved)
                      setSelectedTopFriends(ids)
                      try {
                        await updateTopFriends({
                          variables: { input: { topFriends: ids } },
                          refetchQueries: [
                            { query: TOP_FRIENDS_PROFILES_QUERY, variables: { profileId: viewingProfile?.id || '' } },
                            'Me',
                          ],
                        })
                      } catch { /* silent */ }
                    }

                    const topRow = topFriendsProfiles.slice(0, 7)
                    const bottomRow = topFriendsProfiles.slice(7, 15)

                    const renderFriend = (friend: any, globalIdx: number) => (
                      <div
                        key={friend.id}
                        draggable={topFriendsReorderMode}
                        onDragStart={() => handleDragStart(globalIdx)}
                        onDragOver={(e) => handleDragOver(e, globalIdx)}
                        onDrop={handleDrop}
                        onTouchStart={(e) => handleTouchStart(globalIdx, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(globalIdx)}
                        className={`flex flex-col items-center gap-0.5 group ${topFriendsReorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                        onClick={() => { if (!topFriendsReorderMode) router.push(`/dex/users/${friend.userHandle}`) }}
                      >
                        <div className="relative">
                          {topFriendsReorderMode && (
                            <div className="absolute -top-1 -left-1 z-10 bg-purple-500/80 rounded-full p-0.5">
                              <GripVertical className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {/* X remove button — own profile only, visible on hover or reorder mode */}
                          {isViewingOwnProfile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const updated = selectedTopFriends.filter(id => id !== friend.id)
                                setSelectedTopFriends(updated)
                                updateTopFriends({
                                  variables: { input: { topFriends: updated } },
                                  refetchQueries: [
                                    { query: TOP_FRIENDS_PROFILES_QUERY, variables: { profileId: viewingProfile?.id || '' } },
                                    'Me',
                                  ],
                                }).catch(() => {})
                              }}
                              className={`absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center transition-opacity ${topFriendsReorderMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              title="Remove"
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          )}
                          <div className={`w-10 h-10 rounded-full overflow-hidden bg-gray-800 ring-2 transition-all ${topFriendsReorderMode ? 'ring-purple-400/50' : 'ring-white/10 group-hover:ring-cyan-400/50'}`}>
                            {friend.profilePicture ? (
                              <img src={friend.profilePicture} alt={friend.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                            )}
                          </div>
                          {friend.isOnline && !topFriendsReorderMode && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-900" />
                          )}
                          {(friend.verified || friend.teamMember) && !topFriendsReorderMode && (
                            <div className="absolute -top-0.5 -right-0.5">
                              <BadgeCheck className="w-3 h-3 text-cyan-400" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-500 group-hover:text-white truncate max-w-[56px] text-center transition-colors">{friend.displayName?.split(' ')[0] || friend.userHandle}</span>
                      </div>
                    )

                    return (
                      <div className="px-4 mt-3">
                        <div className="max-w-screen-lg mx-auto">
                          {/* Header: label + reorder toggle (own profile only) */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-pink-400" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top {topFriendsProfiles.length}</span>
                            </div>
                            {isViewingOwnProfile && (
                              <button
                                onClick={() => setTopFriendsReorderMode(!topFriendsReorderMode)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-colors ${topFriendsReorderMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                              >
                                <GripVertical className="w-3 h-3" />
                                {topFriendsReorderMode ? 'Done' : 'Reorder'}
                              </button>
                            )}
                          </div>
                          {/* Row 1: up to 7 friends */}
                          <div className="grid grid-cols-7 gap-2 justify-items-center">
                            {topRow.map((friend: any, i: number) => renderFriend(friend, i))}
                          </div>
                          {/* Row 2: up to 8 friends */}
                          {bottomRow.length > 0 && (
                            <div className="grid grid-cols-8 gap-2 justify-items-center mt-2">
                              {bottomRow.map((friend: any, i: number) => renderFriend(friend, i + 7))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Wallet Address + Actions Row */}
                  {viewingProfile.magicWalletAddress && (
                    <div className="px-4 mt-3">
                      <div className="max-w-screen-lg mx-auto flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm border border-white/10">
                          <Wallet className="w-4 h-4 text-orange-400" />
                          <span className="text-gray-400 font-mono">{viewingProfile.magicWalletAddress.slice(0, 6)}...{viewingProfile.magicWalletAddress.slice(-4)}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(viewingProfile.magicWalletAddress || ''); toast.success('Address copied!'); }}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                        <button
                          onClick={() => setShowWinWinStatsModal(true)}
                          className="p-2 hover:bg-pink-500/20 rounded-lg"
                          title="WIN-WIN Streaming Rewards"
                        >
                          <PiggyBank className="w-4 h-4 text-pink-400" />
                        </button>
                        {!isViewingOwnProfile && (
                          <button
                            onClick={() => setShowProfileTipJar(!showProfileTipJar)}
                            className={`p-2 rounded-lg ${showProfileTipJar ? 'bg-yellow-500/30' : 'hover:bg-yellow-500/20'}`}
                            title={`Tip ${viewingProfile.displayName || viewingProfile.userHandle}`}
                          >
                            <Gift className="w-4 h-4 text-yellow-400" />
                          </button>
                        )}
                      </div>

                      {/* Tip Jar Dropdown - Simplified */}
                      {showProfileTipJar && !isViewingOwnProfile && (
                        <div className="max-w-screen-lg mx-auto mt-2">
                          <Card className="w-full max-w-sm p-4 shadow-xl border border-yellow-500/50 bg-neutral-900">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Gift className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-bold text-yellow-400">Tip {viewingProfile.displayName || viewingProfile.userHandle}</span>
                              </div>
                              <button onClick={() => setShowProfileTipJar(false)} className="p-1 hover:bg-white/10 rounded">
                                <X className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>

                            {/* Amount Input */}
                            <div className="relative mb-3">
                              <input
                                type="number"
                                value={profileTipAmount}
                                onChange={(e) => setProfileTipAmount(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500 pr-16"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-xs font-bold">OGUN</div>
                            </div>

                            {/* Quick Amounts */}
                            <div className="flex gap-2 mb-3">
                              {[1, 5, 10, 25].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => setProfileTipAmount(String(preset))}
                                  className="flex-1 py-1.5 text-xs font-bold rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>

                            {/* Fee */}
                            {profileTipAmount && parseFloat(profileTipAmount) > 0 && (
                              <div className="text-xs text-gray-500 text-center mb-3">
                                Fee: {(parseFloat(profileTipAmount) * 0.0005).toFixed(6)} OGUN (0.05%)
                              </div>
                            )}

                            {/* Send Button */}
                            <button
                              onClick={handleProfileTip}
                              disabled={!profileTipAmount || parseFloat(profileTipAmount) <= 0 || profileTipSending}
                              className="w-full py-2 text-sm bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {profileTipSending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Gift className="w-4 h-4" />
                                  Send Tip
                                </>
                              )}
                            </button>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="relative z-10 max-w-screen-2xl mx-auto px-4 lg:px-6">
                    {/* Profile Tabs - My Feed (own profile only) | Posts | Music | Shop | Playlists | Wall */}
                    <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 bg-black/80 backdrop-blur-md rounded-full px-3 py-1.5 sticky top-0 z-30">
                      {/* Wall tab - FIRST (MySpace style, default open) */}
                      <Button
                        variant="ghost"
                        onClick={() => setProfileTab('wall')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-orange-500/10 ${profileTab === 'wall' ? 'bg-orange-500/10' : ''}`}
                      >
                        <MessageSquare className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'wall' ? 'text-orange-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'wall' ? 'text-orange-400' : 'text-gray-400'}`}>
                          Wall
                        </span>
                      </Button>
                      {/* Posts tab (Public) - before My Feed */}
                      <Button
                        variant="ghost"
                        onClick={() => setProfileTab('posts')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-green-500/10 ${profileTab === 'posts' ? 'bg-green-500/10' : ''}`}
                      >
                        <MessageCircle className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'posts' ? 'text-green-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'posts' ? 'green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                          Posts
                        </span>
                      </Button>
                      {/* My Feed tab - ONLY shown when viewing own profile */}
                      {isViewingOwnProfile && (
                        <Button
                          variant="ghost"
                          onClick={() => setProfileTab('myfeed')}
                          className={`flex-shrink-0 transition-all duration-300 hover:bg-cyan-500/10 ${profileTab === 'myfeed' ? 'bg-cyan-500/10' : ''}`}
                        >
                          <Rss className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'myfeed' ? 'text-cyan-400' : 'text-gray-400'}`} />
                          <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'myfeed' ? 'cyan-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                            My Feed
                          </span>
                        </Button>
                      )}
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
                        onClick={() => setProfileTab('shop')}
                        className={`flex-shrink-0 transition-all duration-300 hover:bg-amber-500/10 ${profileTab === 'shop' ? 'bg-amber-500/10' : ''}`}
                      >
                        <ShoppingBag className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'shop' ? 'text-amber-400' : 'text-gray-400'}`} />
                        <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'shop' ? 'text-amber-400' : 'text-gray-400'}`}>
                          Shop
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
                      {/* Generate tab - BETA: furdA1 only */}
                      {isViewingOwnProfile && viewingProfile.userHandle === 'furdA1' && (
                        <Button
                          variant="ghost"
                          onClick={() => setProfileTab('generate')}
                          className={`flex-shrink-0 transition-all duration-300 hover:bg-violet-500/10 ${profileTab === 'generate' ? 'bg-violet-500/10' : ''}`}
                        >
                          <Sparkles className={`w-4 h-4 mr-2 transition-colors duration-300 ${profileTab === 'generate' ? 'text-violet-400' : 'text-gray-400'}`} />
                          <span className={`text-sm font-black transition-all duration-300 ${profileTab === 'generate' ? 'text-violet-400' : 'text-gray-400'}`}>
                            Generate
                          </span>
                        </Button>
                      )}
                      {/* Bio Accordion Toggle - Only shown when viewing own profile */}
                      {isViewingOwnProfile && (me?.profile?.bio || userData?.me?.profile?.bio) && (
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className={`flex-shrink-0 ml-auto p-2 rounded-lg transition-all duration-300 hover:bg-white/5 ${isBioExpanded ? 'bg-white/5 text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                          title="View my bio"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Bio Accordion Content - Expandable bio panel for own profile */}
                    {isViewingOwnProfile && isBioExpanded && (me?.profile?.bio || userData?.me?.profile?.bio) && (
                      <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-cyan-500/10">
                              <FileText className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white mb-1">My Bio</h4>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                                {me?.profile?.bio || userData?.me?.profile?.bio}
                              </p>
                            </div>
                            <button
                              onClick={() => setIsBioExpanded(false)}
                              className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Profile Reels - Their Reels + Their Circle */}
                    {viewingProfile?.id && (
                      <ProfileReels
                        profileId={viewingProfile.id}
                        profileHandle={viewingProfile.userHandle}
                        profileDisplayName={viewingProfile.displayName}
                        profilePicture={viewingProfile.profilePicture}
                      />
                    )}

                    {/* MySpace-style Wall Audio Playlist (max 4 tracks) */}
                    {((viewingProfile as any)?.wallAudioPlaylist?.length > 0) && (
                      <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-900/30 via-black/50 to-cyan-900/30 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Disc3 className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Wall Playlist</span>
                            <span className="text-[10px] text-gray-500">({(viewingProfile as any).wallAudioPlaylist.length}/4)</span>
                          </div>
                          {isViewingOwnProfile && (
                            <button
                              onClick={async () => {
                                await updateFeaturedTrack({ variables: { input: { wallAudioPlaylist: [] } } })
                                toast.success('Playlist cleared')
                              }}
                              className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {(viewingProfile as any).wallAudioPlaylist.map((item: any, idx: number) => (
                            <div key={item.wallPostId || idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors group">
                              <span className="text-[10px] text-gray-600 w-4 text-center font-mono">{idx + 1}</span>
                              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                {item.coverUrl ? (
                                  <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                    <Music className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate font-medium">{item.title || 'Untitled'}</p>
                                <p className="text-[10px] text-gray-500 truncate">{item.artist}</p>
                              </div>
                              <audio controls src={item.audioUrl} className="h-6 max-w-[120px] sm:max-w-[180px]" style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8)' }} />
                              {isViewingOwnProfile && (
                                <button
                                  onClick={async () => {
                                    const current = (viewingProfile as any).wallAudioPlaylist || []
                                    const updated = current.filter((_: any, i: number) => i !== idx).map((t: any) => ({
                                      audioUrl: t.audioUrl, title: t.title, artist: t.artist, coverUrl: t.coverUrl, wallPostId: t.wallPostId,
                                    }))
                                    await updateFeaturedTrack({ variables: { input: { wallAudioPlaylist: updated } } })
                                    toast.success('Removed from playlist')
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                >
                                  <X className="w-3 h-3 text-red-400" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab Content */}
                    <div className="min-h-[400px] bg-black/40 backdrop-blur-xl rounded-xl p-2 border border-white/10">
                      {/* My Feed - Full social feed (posts from people you follow + your own) */}
                      {/* Using memoized Posts to prevent re-renders when header modals open */}
                      {profileTab === 'myfeed' && isViewingOwnProfile && (
                        MemoizedMyFeedPosts
                      )}
                      {/* Posts - Only this user's posts */}
                      {profileTab === 'posts' && (
                        <Posts profileId={viewingProfile.id} disableVirtualization viewMode={viewMode} />
                      )}
                      {profileTab === 'music' && (
                        <TracksGrid profileId={viewingProfile.id} />
                      )}
                      {/* Shop - Listed NFTs, bundles, tickets, merch for this profile */}
                      {profileTab === 'shop' && (
                        <div className="space-y-4">
                          {/* Shop Header with actions for own profile */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ShoppingBag className="w-5 h-5 text-amber-400" />
                              <h3 className="text-white font-semibold">
                                {isViewingOwnProfile ? 'My Storefront' : `${viewingProfile.displayName || viewingProfile.userHandle}'s Shop`}
                              </h3>
                            </div>
                            {isViewingOwnProfile && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCreateBundleModal(true)}
                                  className="border-amber-500/50 hover:bg-amber-500/10 text-amber-400"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  Bundle
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowSweepPanel(!showSweepPanel)}
                                  className="border-purple-500/50 hover:bg-purple-500/10 text-purple-400"
                                >
                                  <Zap className="w-4 h-4 mr-2" />
                                  Sweep
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Listed tracks filtered by this profile */}
                          {(() => {
                            const profileListings = marketTracks.filter(
                              (track: any) => track.artistProfileId === viewingProfile.id || track.profileId === viewingProfile.id
                            )
                            if (listingLoading) {
                              return (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                  {[...Array(4)].map((_, i) => (
                                    <Card key={i} className="retro-card animate-pulse">
                                      <div className="aspect-square bg-gray-700 rounded-t-lg" />
                                      <div className="p-2 space-y-2">
                                        <div className="h-3 bg-gray-700 rounded w-3/4" />
                                        <div className="h-2 bg-gray-700 rounded w-1/2" />
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )
                            }
                            if (profileListings.length === 0) {
                              return (
                                <Card className="retro-card p-8 text-center">
                                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                                  <h3 className="text-white font-bold mb-2">No Items Listed</h3>
                                  <p className="text-gray-400 text-sm">
                                    {isViewingOwnProfile
                                      ? 'List your published tracks, event tickets, or merch NFTs to start selling'
                                      : 'This artist has no items listed for sale right now'}
                                  </p>
                                  {isViewingOwnProfile && (
                                    <p className="text-amber-400/60 text-xs mt-3">
                                      Go to Music tab → tap a published track → List for Sale
                                    </p>
                                  )}
                                </Card>
                              )
                            }
                            return (
                              <>
                                <span className="text-sm text-amber-400">{profileListings.length} listed</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                  {profileListings.map((track: any, index: number) => (
                                    <TrackNFTCard
                                      key={track.id}
                                      track={{
                                        id: track.id,
                                        title: track.title || 'Untitled',
                                        artist: track.artist || 'Unknown Artist',
                                        artistProfileId: track.artistProfileId,
                                        artworkUrl: track.artworkUrl || undefined,
                                        playbackCount: track.playbackCount || 0,
                                        playbackCountFormatted: track.playbackCountFormatted || '0',
                                        favoriteCount: track.favoriteCount || 0,
                                        genres: track.genres || [],
                                        isFavorite: track.isFavorite || false,
                                        nftData: track.nftData ? {
                                          tokenId: track.nftData.tokenId,
                                          transactionHash: track.nftData.transactionHash || undefined,
                                          contractAddress: track.nftData.contract || undefined,
                                        } : undefined,
                                        listingItem: track.listingItem ? {
                                          price: track.listingItem.pricePerItem || undefined,
                                          pricePerItem: track.listingItem.pricePerItem || undefined,
                                          pricePerItemToShow: track.listingItem.pricePerItemToShow || undefined,
                                          acceptsOGUN: track.listingItem.isPaymentOGUN || false,
                                        } : undefined,
                                        editionSize: track.editionSize || undefined,
                                      }}
                                      onPlay={() => handlePlayTrack(track, index, profileListings)}
                                      isPlaying={isPlaying}
                                      isCurrentTrack={currentSong?.trackId === track.id}
                                      onFavorite={async () => {
                                        await toggleFavorite({ variables: { trackId: track.id }, refetchQueries: ['FavoriteTracks', 'ListingItems'] })
                                      }}
                                    />
                                  ))}
                                </div>
                              </>
                            )
                          })()}
                        </div>
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
                      {profileTab === 'wall' && (
                        <ProfileWall
                          profileId={viewingProfile.id}
                          isOwnProfile={isViewingOwnProfile}
                          viewerProfileId={me?.profile?.id}
                          profileName={viewingProfile.displayName}
                          userHandle={viewingProfile.userHandle}
                          highlightPostId={wallPostId}
                          onSetProfileSong={isViewingOwnProfile ? async (audio) => {
                            await updateFeaturedTrack({
                              variables: {
                                input: {
                                  featuredTrackId: '',
                                  featuredAudioUrl: audio.url,
                                  featuredAudioTitle: audio.title,
                                  featuredAudioArtist: audio.artist,
                                  featuredAudioCoverUrl: audio.coverUrl || '',
                                },
                              },
                            })
                            toast.success(`Profile song set to "${audio.title}"`)
                          } : undefined}
                          onAddToPlaylist={isViewingOwnProfile ? async (audio) => {
                            const current = (viewingProfile as any)?.wallAudioPlaylist || []
                            if (current.length >= 4) {
                              toast.error('Profile playlist is full (max 4 tracks)')
                              return
                            }
                            if (current.some((t: any) => t.wallPostId === audio.wallPostId)) {
                              toast.info('Already in your playlist')
                              return
                            }
                            await updateFeaturedTrack({
                              variables: {
                                input: {
                                  wallAudioPlaylist: [
                                    ...current.map((t: any) => ({
                                      audioUrl: t.audioUrl,
                                      title: t.title,
                                      artist: t.artist,
                                      coverUrl: t.coverUrl,
                                      wallPostId: t.wallPostId,
                                    })),
                                    {
                                      audioUrl: audio.url,
                                      title: audio.title,
                                      artist: audio.artist,
                                      coverUrl: audio.coverUrl || '',
                                      wallPostId: audio.wallPostId,
                                    },
                                  ],
                                },
                              },
                            })
                            toast.success(`Added "${audio.title}" to profile playlist`)
                          } : undefined}
                        />
                      )}
                      {profileTab === 'generate' && isViewingOwnProfile && viewingProfile.userHandle === 'furdA1' && (
                        <GeneratePanel />
                      )}
                    </div>
                  </div>

                </>
              )}
            </div>
            </ProfileErrorBoundary>
          )}
        </div>

        {/* Footer removed for cleaner app experience */}
      </div>

      {/* Modals */}
      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} onConnect={handleWalletConnect} />

      {/* Top 100 NFTs Modal */}
      {showTop100Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black" onClick={() => setShowTop100Modal(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border-2 border-yellow-500 bg-gradient-to-br from-neutral-900 via-yellow-900/10 to-neutral-900 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-900 to-orange-900 px-4 py-3 flex items-center justify-between border-b border-yellow-500">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <div>
                  <span className="font-bold text-yellow-100 text-sm">Top 100 Tracks</span>
                  <p className="text-xs text-yellow-200/60">Most streamed tracks</p>
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

      {/* MY TRACKS COLLECTION DROPDOWN PANEL - Like notifications bell */}
      {showTracksCollectionModal && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowTracksCollectionModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="absolute left-4 right-4 top-20 sm:left-auto sm:right-4 sm:w-96 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden border-2 border-cyan-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-900/50 to-purple-900/50">
              <h3 className="retro-title text-sm flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                My Tracks
                <span className="text-xs text-gray-400">({myCreatedTracks.length} · {favoriteTracksData?.favoriteTracks?.nodes?.length || 0} ❤️)</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTracksCollectionModal(false)} className="w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-cyan-500/30">
              <button
                onClick={() => setTracksCollectionTab('owned')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tracksCollectionTab === 'owned' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10' : 'text-gray-400 hover:text-white'
                }`}
              >
                🎵 My Tracks ({myCreatedTracks.length})
              </button>
              <button
                onClick={() => setTracksCollectionTab('favorites')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tracksCollectionTab === 'favorites' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/10' : 'text-gray-400 hover:text-white'
                }`}
              >
                ❤️ Favorites ({favoriteTracksData?.favoriteTracks?.nodes?.length || 0})
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-100px)] custom-scrollbar">
              {tracksCollectionTab === 'owned' ? (
                myCreatedTracks.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tracks yet</p>
                    <Button className="mt-3 retro-button text-xs" onClick={() => { setShowTracksCollectionModal(false); setSelectedView('marketplace') }}>
                      Browse Marketplace
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {myCreatedTracks.map((track: any, index: number) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-cyan-500/10 cursor-pointer transition-colors group"
                        onClick={() => { handlePlayTrack(track, index, myCreatedTracks); setShowTracksCollectionModal(false) }}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt={track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white" fill="white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.title}</p>
                          <p className="text-gray-500 text-xs truncate">{track.artist || track.profile?.displayName}</p>
                        </div>
                        <div className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded text-[9px] font-bold text-white">NFT</div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                favoriteTracksLoading ? (
                  <div className="py-8 text-center text-gray-400">
                    <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">Loading...</p>
                  </div>
                ) : (favoriteTracksData?.favoriteTracks?.nodes?.length ?? 0) === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Heart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No favorites yet</p>
                    <p className="text-xs text-gray-500 mt-1">Heart tracks to add them here</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {favoriteTracksData?.favoriteTracks?.nodes?.map((track: any, index: number) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-pink-500/10 cursor-pointer transition-colors group"
                        onClick={() => { handlePlayTrack(track, index, favoriteTracksData?.favoriteTracks?.nodes || []); setShowTracksCollectionModal(false) }}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <img src={track.artworkUrl ?? '/images/default-artwork.png'} alt={track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white" fill="white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.title}</p>
                          <p className="text-gray-500 text-xs truncate">{track.artist || track.profile?.displayName}</p>
                        </div>
                        <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            {/* Play All Footer */}
            {((tracksCollectionTab === 'owned' && myCreatedTracks.length > 0) ||
              (tracksCollectionTab === 'favorites' && (favoriteTracksData?.favoriteTracks?.nodes?.length ?? 0) > 0)) && (
              <div className="border-t border-cyan-500/30 p-2">
                <Button
                  className="w-full retro-button text-xs py-2"
                  onClick={() => {
                    const tracks = tracksCollectionTab === 'owned' ? myCreatedTracks : (favoriteTracksData?.favoriteTracks?.nodes || [])
                    if (tracks.length > 0) { handlePlayTrack(tracks[0], 0, tracks); setShowTracksCollectionModal(false) }
                  }}
                >
                  <Play className="w-3 h-3 mr-1" fill="currentColor" />
                  Play All
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FOLLOWERS DROPDOWN PANEL */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowFollowersModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="absolute left-4 right-4 top-20 sm:left-auto sm:right-4 sm:w-80 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden border-2 border-purple-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
              <h3 className="retro-title text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Followers
                <span className="text-xs text-gray-400">({myFollowersList.length})</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFollowersModal(false)} className="w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)] custom-scrollbar">
              {myFollowersList.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No followers yet</p>
                  <p className="text-xs text-gray-500 mt-1">Share your profile to grow your audience</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {myFollowersList.map((follower: any) => (
                    <div key={follower.id} className="rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-2 hover:bg-purple-500/10 transition-colors">
                        <Link
                          href={`/dex/users/${follower.userHandle}`}
                          onClick={() => setShowFollowersModal(false)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <Avatar className="w-10 h-10">
                            {follower.avatar ? <AvatarImage src={follower.avatar} /> : null}
                            <AvatarFallback className="bg-purple-500/20 text-purple-300">{follower.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate flex items-center gap-1">
                              {follower.name}
                              {follower.isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
                            </p>
                            <p className="text-gray-500 text-xs truncate">{follower.username}</p>
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-8 h-8 p-0 flex-shrink-0 ${quickDMUserId === follower.id ? 'text-white bg-purple-500/30' : 'text-purple-400 hover:text-white hover:bg-purple-500/20'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickDMUserId(quickDMUserId === follower.id ? null : follower.id)
                            setTipJarUserId(null)
                            setQuickDMMessage('')
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-8 h-8 p-0 flex-shrink-0 ${tipJarUserId === follower.id ? 'text-white bg-pink-500/30' : 'text-pink-400 hover:text-white hover:bg-pink-500/20'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setTipJarUserId(tipJarUserId === follower.id ? null : follower.id)
                            setQuickDMUserId(null)
                          }}
                        >
                          <PiggyBank className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Quick DM Accordion */}
                      {quickDMUserId === follower.id && (
                        <div className="px-2 pb-2 bg-purple-500/10 border-t border-purple-500/20">
                          <div className="flex gap-2 pt-2">
                            <input
                              type="text"
                              placeholder={`Message ${follower.name}...`}
                              value={quickDMMessage}
                              onChange={(e) => setQuickDMMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && quickDMMessage.trim() && !quickDMSending) {
                                  setQuickDMSending(true)
                                  sendMessage({ variables: { input: { toId: follower.id, message: quickDMMessage.trim() } } })
                                    .then(() => {
                                      setQuickDMMessage('')
                                      setQuickDMUserId(null)
                                      toast.success(`Message sent to ${follower.name}!`)
                                    })
                                    .catch(() => toast.error('Failed to send message'))
                                    .finally(() => setQuickDMSending(false))
                                }
                              }}
                              className="flex-1 bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              disabled={!quickDMMessage.trim() || quickDMSending}
                              className="bg-purple-500 hover:bg-purple-600 text-white px-3"
                              onClick={() => {
                                if (quickDMMessage.trim() && !quickDMSending) {
                                  setQuickDMSending(true)
                                  sendMessage({ variables: { input: { toId: follower.id, message: quickDMMessage.trim() } } })
                                    .then(() => {
                                      setQuickDMMessage('')
                                      setQuickDMUserId(null)
                                      toast.success(`Message sent to ${follower.name}!`)
                                    })
                                    .catch(() => toast.error('Failed to send message'))
                                    .finally(() => setQuickDMSending(false))
                                }
                              }}
                            >
                              {quickDMSending ? '...' : 'Send'}
                            </Button>
                          </div>
                        </div>
                      )}
                      {/* Tip Jar Coming Soon Accordion */}
                      {tipJarUserId === follower.id && (
                        <div className="px-2 pb-2 bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-t border-pink-500/20">
                          <div className="pt-3 pb-1 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <PiggyBank className="w-5 h-5 text-pink-400" />
                              <span className="text-pink-400 font-bold text-sm">Tip Jar</span>
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-full">COMING SOON</span>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">
                              Tip {follower.name} with <span className="text-cyan-400">Tracks</span> or <span className="text-green-400">Tokens</span> directly to their wallet!
                            </p>
                            <p className="text-gray-500 text-[10px] mt-2">
                              Multi-chain support · ZetaChain sweep · 0.05 fee
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* FOLLOWING DROPDOWN PANEL */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-[100]" onClick={() => setShowFollowingModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="absolute left-4 right-4 top-20 sm:left-auto sm:right-4 sm:w-80 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden border-2 border-green-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-green-500/30 bg-gradient-to-r from-green-900/50 to-teal-900/50">
              <h3 className="retro-title text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Following
                <span className="text-xs text-gray-400">({myFollowingList.length})</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFollowingModal(false)} className="w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)] custom-scrollbar">
              {myFollowingList.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not following anyone yet</p>
                  <p className="text-xs text-gray-500 mt-1">Discover artists to follow</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {myFollowingList.map((following: any) => (
                    <div key={following.id} className="rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-2 hover:bg-green-500/10 transition-colors">
                        <Link
                          href={`/dex/users/${following.userHandle}`}
                          onClick={() => setShowFollowingModal(false)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <Avatar className="w-10 h-10">
                            {following.avatar ? <AvatarImage src={following.avatar} /> : null}
                            <AvatarFallback className="bg-green-500/20 text-green-300">{following.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate flex items-center gap-1">
                              {following.name}
                              {following.isVerified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
                            </p>
                            <p className="text-gray-500 text-xs truncate">{following.username}</p>
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-8 h-8 p-0 flex-shrink-0 ${quickDMUserId === following.id ? 'text-white bg-green-500/30' : 'text-green-400 hover:text-white hover:bg-green-500/20'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickDMUserId(quickDMUserId === following.id ? null : following.id)
                            setTipJarUserId(null)
                            setQuickDMMessage('')
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-8 h-8 p-0 flex-shrink-0 ${tipJarUserId === following.id ? 'text-white bg-pink-500/30' : 'text-pink-400 hover:text-white hover:bg-pink-500/20'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setTipJarUserId(tipJarUserId === following.id ? null : following.id)
                            setQuickDMUserId(null)
                          }}
                        >
                          <PiggyBank className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Quick DM Accordion */}
                      {quickDMUserId === following.id && (
                        <div className="px-2 pb-2 bg-green-500/10 border-t border-green-500/20">
                          <div className="flex gap-2 pt-2">
                            <input
                              type="text"
                              placeholder={`Message ${following.name}...`}
                              value={quickDMMessage}
                              onChange={(e) => setQuickDMMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && quickDMMessage.trim() && !quickDMSending) {
                                  setQuickDMSending(true)
                                  sendMessage({ variables: { input: { toId: following.id, message: quickDMMessage.trim() } } })
                                    .then(() => {
                                      setQuickDMMessage('')
                                      setQuickDMUserId(null)
                                      toast.success(`Message sent to ${following.name}!`)
                                    })
                                    .catch(() => toast.error('Failed to send message'))
                                    .finally(() => setQuickDMSending(false))
                                }
                              }}
                              className="flex-1 bg-black/50 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              disabled={!quickDMMessage.trim() || quickDMSending}
                              className="bg-green-500 hover:bg-green-600 text-white px-3"
                              onClick={() => {
                                if (quickDMMessage.trim() && !quickDMSending) {
                                  setQuickDMSending(true)
                                  sendMessage({ variables: { input: { toId: following.id, message: quickDMMessage.trim() } } })
                                    .then(() => {
                                      setQuickDMMessage('')
                                      setQuickDMUserId(null)
                                      toast.success(`Message sent to ${following.name}!`)
                                    })
                                    .catch(() => toast.error('Failed to send message'))
                                    .finally(() => setQuickDMSending(false))
                                }
                              }}
                            >
                              {quickDMSending ? '...' : 'Send'}
                            </Button>
                          </div>
                        </div>
                      )}
                      {/* Tip Jar Coming Soon Accordion */}
                      {tipJarUserId === following.id && (
                        <div className="px-2 pb-2 bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-t border-pink-500/20">
                          <div className="pt-3 pb-1 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <PiggyBank className="w-5 h-5 text-pink-400" />
                              <span className="text-pink-400 font-bold text-sm">Tip Jar</span>
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-full">COMING SOON</span>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">
                              Tip {following.name} with <span className="text-cyan-400">Tracks</span> or <span className="text-green-400">Tokens</span> directly to their wallet!
                            </p>
                            <p className="text-gray-500 text-[10px] mt-2">
                              Multi-chain support · ZetaChain sweep · 0.05 fee
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {connectedWallet && (
        <GuestPostModal
          isOpen={showGuestPostModal}
          onClose={() => setShowGuestPostModal(false)}
          walletAddress={connectedWallet}
        />
      )}
      <MoltbookPanel
        isOpen={showBackendPanel}
        onClose={() => setShowBackendPanel(false)}
        totalTracks={tracksData?.groupedTracks?.pageInfo?.totalCount}
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

      {/* Bio Panel - Followers/Following Modal */}
      {myProfileIdForFollowers && (
        <FollowModal
          show={showBioFollowModal}
          profileId={myProfileIdForFollowers}
          modalType={bioFollowModalType}
          onClose={() => setShowBioFollowModal(false)}
          dropdown={true}
        />
      )}

      {/* Bio Panel - Tracks Mini Modal */}
      {showBioTracksModal && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={() => setShowBioTracksModal(false)}
          />
          <div className="fixed left-4 right-4 top-1/4 z-[9999] animate-in zoom-in-95 duration-150">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl max-w-md mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-white">
                    My Tracks ({me?.profile?.tracksCount || userData?.me?.profile?.tracksCount || 0})
                  </span>
                </div>
                <button onClick={() => setShowBioTracksModal(false)} className="text-neutral-500 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Track Grid */}
              <div className="p-3 max-h-[300px] overflow-y-auto">
                {(ownedTracksData?.groupedTracks?.nodes || []).length === 0 ? (
                  <p className="text-center text-neutral-500 py-6 text-sm">No tracks yet</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {(ownedTracksData?.groupedTracks?.nodes || []).slice(0, 16).map((track: any) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setShowBioTracksModal(false)
                          handlePlayTrack(track, 0, ownedTracksData?.groupedTracks?.nodes || [])
                        }}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-800 hover:ring-2 hover:ring-orange-500 transition-all"
                      >
                        {track.artworkUrl ? (
                          <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                            <Music className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* View All link */}
                {(ownedTracksData?.groupedTracks?.nodes || []).length > 16 && (
                  <button
                    onClick={() => {
                      setShowBioTracksModal(false)
                      setIsBioExpanded(false)
                      router.push(`/dex/users/${me?.profile?.userHandle || userData?.me?.profile?.userHandle}`)
                    }}
                    className="w-full mt-3 py-2 text-xs text-orange-400 hover:text-orange-300 transition-colors border-t border-neutral-800"
                  >
                    View all {me?.profile?.tracksCount || userData?.me?.profile?.tracksCount || 0} tracks...
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Token Listing Modal */}
      <CreateTokenListingModal
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        onSuccess={(listing) => {
          setTokenListings(prev => [listing, ...prev])
          setShowCreateTokenModal(false)
        }}
      />

      {/* Create Bundle Listing Modal */}
      <CreateBundleListingModal
        isOpen={showCreateBundleModal}
        onClose={() => setShowCreateBundleModal(false)}
        onSuccess={(listing) => {
          setBundleListings(prev => [listing, ...prev])
          setShowCreateBundleModal(false)
        }}
      />

      {/* List NFT Modal - inline listing from wallet view */}
      <ListNFTModal
        isOpen={!!listNFTModalTrack}
        onClose={() => setListNFTModalTrack(null)}
        track={listNFTModalTrack}
        walletAddress={activeAddress || walletAccount || ''}
        polBalance={activeBalance || maticBalance || '0'}
        ogunBalance={activeOgunBalance || ogunBalance || '0'}
        web3={magicWeb3 || null}
      />

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
  const emptyOgData = { type: null as 'track' | 'profile' | 'playlist' | 'story' | null }

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

    // Only fetch OG data for track, profile, playlist, and story pages
    if (!routeType || !routeId || (routeType !== 'track' && routeType !== 'users' && routeType !== 'playlist' && routeType !== 'story')) {
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
    // Check for ?wall= param first — if present, use wall post media for OG tags
    if (routeType === 'users') {
      const wallPostId = (context.query.wall as string) || null
      const domainUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://www.soundchain.io'
      const fallbackImage = `${domainUrl}/soundchain-meta-logo.png`

      // Helper: convert IPFS URLs to publicly accessible gateway URLs for crawlers
      const toPublicUrl = (url: string | null | undefined): string => {
        if (!url) return fallbackImage
        if (url.startsWith('ipfs://')) return `https://dweb.link/ipfs/${url.replace('ipfs://', '')}`
        if (url.startsWith('/ipfs/')) return `https://dweb.link${url}`
        if (url.includes('gateway.pinata.cloud') || url.includes('mypinata.cloud')) {
          const match = url.match(/\/ipfs\/([^/?]+)/)
          if (match) return `https://dweb.link/ipfs/${match[1]}`
        }
        if (url && !url.startsWith('http')) return `${domainUrl}${url.startsWith('/') ? '' : '/'}${url}`
        return url
      }

      // Wall post OG tags — show the post's media instead of profile picture
      if (wallPostId) {
        try {
          const { gql } = await import('@apollo/client')
          const WALL_POST_QUERY = gql`
            query WallPostOG($id: String!) {
              wallPost(id: $id) {
                id
                body
                mediaUrl
                mediaType
                coverArtUrl
                mediaThumbnailUrl
                author { displayName userHandle profilePicture }
              }
            }
          `
          const { data: wallData } = await apolloClient.query({
            query: WALL_POST_QUERY,
            variables: { id: wallPostId },
            errorPolicy: 'all',
          })

          if (wallData?.wallPost) {
            const wp = wallData.wallPost
            const authorName = wp.author?.displayName || wp.author?.userHandle || routeId

            // Pick the best image based on media type
            let ogImage = fallbackImage
            if (wp.mediaType === 'audio' && wp.coverArtUrl) {
              ogImage = toPublicUrl(wp.coverArtUrl)
            } else if (wp.mediaType === 'image' && wp.mediaUrl) {
              ogImage = toPublicUrl(wp.mediaUrl)
            } else if (wp.mediaType === 'video' && wp.mediaThumbnailUrl) {
              ogImage = toPublicUrl(wp.mediaThumbnailUrl)
            } else if (wp.mediaUrl) {
              ogImage = toPublicUrl(wp.coverArtUrl || wp.mediaUrl)
            } else if (wp.author?.profilePicture) {
              ogImage = toPublicUrl(wp.author.profilePicture)
            }

            const bodySnippet = wp.body ? wp.body.slice(0, 120) : 'Wall post'
            const title = `${authorName} on SoundChain`

            return {
              props: {
                ogData: {
                  type: 'profile' as const,
                  title,
                  description: bodySnippet,
                  image: ogImage,
                  url: `/dex/users/${routeId}?wall=${wallPostId}`,
                },
                isBot,
              },
            }
          }
        } catch (wallError) {
          console.error('Wall post OG fetch error:', wallError)
        }
      }

      // Default profile OG tags (no ?wall= param or wall post not found)
      try {
        const { data } = await apolloClient.query({
          query: graphql.ProfileByHandleDocument,
          variables: { handle: routeId },
          errorPolicy: 'all',
        })

        if (data?.profileByHandle) {
          const profile = data.profileByHandle
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

    // Story page: /dex/story/[handle]/[storyId]
    if (routeType === 'story') {
      const storyId = slug?.[2]
      if (storyId) {
        try {
          const { gql: gqlTag } = await import('@apollo/client')
          const { data } = await apolloClient.query({
            query: gqlTag`
              query StoryOG($id: String!) {
                story(id: $id) {
                  id
                  mediaUrl
                  mediaType
                  caption
                  creatorDisplayName
                  creatorUserHandle
                  attachedTrackTitle
                  attachedTrackArtist
                  attachedTrackCoverUrl
                }
              }
            `,
            variables: { id: storyId },
            errorPolicy: 'all',
          })

          if (data?.story) {
            const story = data.story
            const domainUrl = process.env.NEXT_PUBLIC_DOMAIN_URL || 'https://www.soundchain.io'
            const fallbackImage = `${domainUrl}/soundchain-meta-logo.png`
            // For stories with attached tracks, use the track cover art
            // For image stories, use the story media directly
            // For video stories, use cover art or fallback (video URLs can't be og:image)
            let ogImage = story.attachedTrackCoverUrl || (story.mediaType === 'image' ? story.mediaUrl : null) || fallbackImage
            // Convert IPFS URLs to dweb.link gateway for maximum social crawler compatibility
            // (Pinata gateway may rate-limit crawlers; dweb.link is more universally accessible)
            if (ogImage && ogImage.startsWith('ipfs://')) {
              ogImage = `https://dweb.link/ipfs/${ogImage.replace('ipfs://', '')}`
            } else if (ogImage && ogImage.includes('/ipfs/')) {
              // Convert Pinata or other IPFS gateway URLs to dweb.link
              const cidMatch = ogImage.match(/\/ipfs\/(.+)$/)
              if (cidMatch) {
                ogImage = `https://dweb.link/ipfs/${cidMatch[1]}`
              }
            }
            if (ogImage && !ogImage.startsWith('http')) {
              ogImage = `${domainUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
            }
            const creatorName = story.creatorDisplayName || story.creatorUserHandle || routeId
            const title = story.attachedTrackTitle
              ? `${story.attachedTrackTitle} by ${story.attachedTrackArtist || 'Unknown'} | ${creatorName} on SoundChain`
              : `${creatorName}'s Story | SoundChain`
            const description = story.caption
              || (story.attachedTrackTitle ? `Listen to "${story.attachedTrackTitle}" shared by ${creatorName} on SoundChain` : `View ${creatorName}'s story on SoundChain`)
            return {
              props: {
                ogData: {
                  type: 'story' as const,
                  title,
                  description,
                  image: ogImage,
                  url: `/dex/story/${routeId}/${storyId}`,
                },
                isBot,
              },
            }
          }
        } catch (storyError) {
          console.error('Story OG fetch error:', storyError)
        }
      }
    }
  } catch (error) {
    console.error('SSR getServerSideProps error:', error)
  }

  // Return empty OG data if anything fails - page still loads
  return { props: { ogData: emptyOgData, isBot } }
}

export default DEXDashboard
