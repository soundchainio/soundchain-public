import React, { useState, useMemo, useCallback, ReactElement, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Image from 'next/image'
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
import { config } from 'config'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar'
import { useMagicContext } from 'hooks/useMagicContext'
import { NFTCard } from 'components/dex/NFTCard'
import { TrackNFTCard } from 'components/dex/TrackNFTCard'
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
import { useMeQuery, useGroupedTracksQuery, useTracksQuery, useListingItemsQuery, useExploreUsersQuery, useExploreTracksQuery, useFollowProfileMutation, useUnfollowProfileMutation, useTrackQuery, useProfileQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { SelectToApolloQuery, SortListingItem } from 'lib/apollo/sorting'
import { StateProvider } from 'contexts'
import { ModalProvider } from 'contexts/ModalContext'
import { AudioPlayerProvider } from 'hooks/useAudioPlayer'
import { TrackProvider } from 'hooks/useTrack'
import { HideBottomNavBarProvider } from 'hooks/useHideBottomNavBar'
import { LayoutContextProvider } from 'hooks/useLayoutContext'
import { ToastContainer } from 'react-toastify'
import dynamic from 'next/dynamic'
import {
  Grid, List, Coins, Image as ImageIcon, Package, Search, Home, Music, Library,
  ShoppingBag, Plus, Wallet, Bell, TrendingUp, Zap, Globe, BarChart3, Play, Pause,
  Users, MessageCircle, Share2, Copy, Trophy, Flame, Rocket, Heart, Server,
  Database, X, ChevronDown, ExternalLink, LogOut as Logout, BadgeCheck, ListMusic, Compass
} from 'lucide-react'

const MobileBottomAudioPlayer = dynamic(() => import('components/common/BottomAudioPlayer/MobileBottomAudioPlayer'))
const DesktopBottomAudioPlayer = dynamic(() => import('components/common/BottomAudioPlayer/DesktopBottomAudioPlayer'))
const AudioEngine = dynamic(() => import('components/common/BottomAudioPlayer/AudioEngine'))
const Posts = dynamic(() => import('components/Post/Posts').then(mod => ({ default: mod.Posts })), { ssr: false })
const Notifications = dynamic(() => import('components/Notifications').then(mod => ({ default: mod.Notifications })), { ssr: false })

// Real NFT data comes from the database via listingItems query
// NFT listings with prices will be shown in the NFT tab
// Tracks without listings are streaming-only (no price)
// This is what makes SoundChain unique - dual purpose NFTs!

// Navigation pages removed - all tabs now in main DEX view
const navigationPages: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = []

// WalletConnect Modal Component
function WalletConnectModal({ isOpen, onClose, onConnect }: { isOpen: boolean; onClose: () => void; onConnect: (address: string, walletType: string) => void }) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wallets = [
    { name: 'MetaMask', icon: '🦊', popular: true, id: 'metamask' },
    { name: 'WalletConnect', icon: '🔗', popular: true, id: 'walletconnect' },
    { name: 'Coinbase', icon: '🔵', popular: false, id: 'coinbase' },
    { name: 'Rainbow', icon: '🌈', popular: false, id: 'rainbow' },
    { name: 'Trust Wallet', icon: '💙', popular: false, id: 'trust' },
  ]

  const handleMetaMaskConnect = async () => {
    try {
      setConnecting(true)
      setError(null)

      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed. Please install MetaMask extension.')
        setConnecting(false)
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
    }
  }

  const handleWalletClick = async (walletId: string, walletName: string) => {
    if (walletId === 'metamask') {
      await handleMetaMaskConnect()
    } else {
      // For other wallets, show a "coming soon" message for now
      setError(`${walletName} integration coming soon! Please use MetaMask for now.`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <Card className="retro-card relative z-10 w-full max-w-md mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="retro-title text-lg">Connect Wallet</h2>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={connecting}><X className="w-4 h-4" /></Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {wallets.map((wallet) => (
              <Button
                key={wallet.name}
                variant="outline"
                className="w-full justify-between retro-button hover:bg-cyan-500/20 disabled:opacity-50"
                onClick={() => handleWalletClick(wallet.id, wallet.name)}
                disabled={connecting}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{wallet.icon}</span>
                  <span className="retro-text">{wallet.name}</span>
                  {connecting && wallet.id === 'metamask' && <span className="text-xs text-cyan-400">Connecting...</span>}
                </div>
                {wallet.popular && <Badge className="bg-yellow-500/20 text-yellow-400">Popular</Badge>}
              </Button>
            ))}
          </div>
          <div className="text-xs retro-json text-center mt-4 pt-4 border-t border-cyan-500/30">
            By connecting, you agree to Terms of Service
          </div>
        </CardContent>
      </Card>
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

function DEXDashboard() {
  const router = useRouter()

  // Parse slug for routing: /dex/explore, /dex/library, /dex/profile/[handle], /dex/track/[id]
  const slug = router.query.slug as string[] | undefined
  const routeType = slug?.[0] || 'home' // First segment: explore, library, profile, track, etc.
  const routeId = slug?.[1] || null     // Second segment: profile handle or track id

  // Legacy UI Modal Hooks
  const { dispatchShowCreateModal } = useModalDispatch()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Determine initial view based on URL slug
  const getInitialView = () => {
    switch (routeType) {
      case 'explore': return 'explore'
      case 'library': return 'library'
      case 'profile': return 'profile'
      case 'track': return 'track'
      case 'marketplace': return 'marketplace'
      case 'feed': return 'feed'
      case 'wallet': return 'wallet'
      case 'settings': return 'settings'
      case 'messages': return 'messages'
      case 'notifications': return 'notifications'
      default: return 'dashboard'
    }
  }

  const [selectedView, setSelectedView] = useState<'marketplace' | 'feed' | 'dashboard' | 'explore' | 'library' | 'playlist' | 'profile' | 'track' | 'wallet' | 'settings' | 'messages' | 'notifications' | 'users'>(getInitialView())
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'tracks' | 'nft' | 'token' | 'bundle'>('tracks')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showBackendPanel, setShowBackendPanel] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)
  const [exploreSearchQuery, setExploreSearchQuery] = useState('')
  const [exploreTab, setExploreTab] = useState<'tracks' | 'users'>('users')
  const [tracksViewMode, setTracksViewMode] = useState<'browse' | 'leaderboard'>('browse')
  const [usersViewMode, setUsersViewMode] = useState<'browse' | 'leaderboard'>('browse')

  // Sync selectedView with URL changes (for back/forward navigation)
  useEffect(() => {
    const newView = getInitialView()
    if (newView !== selectedView && ['explore', 'library', 'profile', 'track', 'marketplace', 'feed', 'dashboard', 'wallet', 'settings', 'messages', 'notifications', 'users'].includes(newView)) {
      setSelectedView(newView as any)
    }
  }, [routeType])

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
  const { balance: maticBalance, ogunBalance, account: walletAccount } = useMagicContext()

  // Create+ Button Handler (Legacy UI Pattern)
  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  // Logout handler
  const onLogout = async () => {
    await setJwt()
    router.reload()
  }

  // Real SoundChain data - YOUR profile (only fetch if needed, use cache-first for speed)
  const { data: userData, loading: userLoading, error: userError } = useMeQuery({
    ssr: false,
    fetchPolicy: 'cache-first', // Speed: use cache, don't hit network unless stale
  })

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

  // Track if we're loading more
  const [loadingMore, setLoadingMore] = useState(false)

  // Load more tracks using cursor pagination
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
          return {
            ...fetchMoreResult,
            groupedTracks: {
              ...fetchMoreResult.groupedTracks,
              nodes: [
                ...(prev.groupedTracks?.nodes || []),
                ...(fetchMoreResult.groupedTracks?.nodes || []),
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
    variables: { page: { first: 10 }, sort: SelectToApolloQuery[SortListingItem.CreatedAt], filter: {} }, // Reduced from 20 to 10
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
  // SPEED: cache-first, fetch when on explore OR users view
  const { data: exploreUsersData, loading: exploreUsersLoading } = useExploreUsersQuery({
    variables: {
      search: selectedView === 'users' ? undefined : (exploreSearchQuery.trim() || undefined), // No search filter on users view
      page: { first: selectedView === 'users' ? 50 : 20 } // Load more users on users view
    },
    skip: selectedView !== 'explore' && selectedView !== 'users',
    fetchPolicy: 'cache-first', // Speed: instant from cache
  })

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

  // Follow/Unfollow mutations
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation()
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation()

  // Track Detail Query - fetch single track when viewing /dex/track/[id]
  const { data: trackDetailData, loading: trackDetailLoading, error: trackDetailError } = useTrackQuery({
    variables: { id: routeId || '' },
    skip: selectedView !== 'track' || !routeId,
    fetchPolicy: 'cache-and-network',
  })

  // Profile Detail Query - fetch single profile when viewing /dex/profile/[handle]
  const { data: profileDetailData, loading: profileDetailLoading, error: profileDetailError } = useProfileQuery({
    variables: { id: routeId || '' },
    skip: selectedView !== 'profile' || !routeId,
    fetchPolicy: 'cache-and-network',
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
  const userWallet = userData?.me?.defaultWallet
  const userTracks = tracksData?.groupedTracks?.nodes || []
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Full-screen Cover Photo Background */}
      <div className="fixed inset-0 z-0">
        {user?.coverPicture && !coverImageError ? (
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

              <div className="hidden lg:flex items-center space-x-2">
                {navigationPages.map((page) => (
                  <Link key={page.name} href={page.href}>
                    <Button variant="ghost" size="sm" className={`hover:bg-cyan-500/10 ${page.href === '/dex' ? 'text-cyan-400 bg-cyan-500/10' : ''}`}>
                      <page.icon className="w-4 h-4 mr-2" />
                      {page.name}
                    </Button>
                  </Link>
                ))}

                {/* Create+ Button - Legacy UI Pattern with Modal */}
                {isMinting ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateClick}
                    className="hover:bg-cyan-500/10 nyan-cat-animation"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Minting...
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateClick}
                    className="hover:bg-cyan-500/10"
                  >
                    <NewPost className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative hidden lg:block">
                <input type="search" placeholder="Search..." className="w-60 bg-black/40 border border-cyan-500/20 rounded-full px-4 py-2 pl-10 text-sm" />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-cyan-400/60" />
              </div>

              {/* Backend Tab Button */}
              <Button variant="ghost" size="sm" onClick={() => setShowBackendPanel(true)} className="hover:bg-purple-500/20">
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
                  {user?.unreadNotificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {user.unreadNotificationCount}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <Card className="absolute right-0 top-12 w-96 retro-card z-50 shadow-2xl max-h-[70vh] overflow-hidden">
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

              <Button
                onClick={() => isWalletConnected ? setIsWalletConnected(false) : setShowWalletModal(true)}
                className={isWalletConnected ? 'bg-green-600 hover:bg-green-700' : 'retro-button'}
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isWalletConnected ? `${connectedWallet?.slice(0, 8)}...` : 'Connect'}
              </Button>

              <div className="relative">
                <Avatar
                  className="w-10 h-10 analog-glow cursor-pointer bg-gradient-to-br from-purple-600 to-cyan-600 hover:ring-2 hover:ring-cyan-400"
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
                            <Link href="/dex">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => {setShowUserMenu(false); setSelectedView('dashboard')}}>
                                <WalletIcon className="w-4 h-4 mr-3" />
                                Wallet
                              </Button>
                            </Link>
                            <Link href="https://soundchain.gitbook.io/soundchain/" target="_blank" rel="noreferrer">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
                                <Document className="w-4 h-4 mr-3" />
                                Docs
                                <ExternalLink className="w-3 h-3 ml-auto" />
                              </Button>
                            </Link>
                            <Link href="/feedback">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
                                <Feedback className="w-4 h-4 mr-3" />
                                Leave Feedback
                              </Button>
                            </Link>
                            {userData?.me?.roles?.includes(Role.Admin) && (
                              <Link href="/manage-requests">
                                <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
                                  <VerifiedIcon className="w-4 h-4 mr-3" />
                                  Admin Panel
                                </Button>
                              </Link>
                            )}
                            <Link href="/settings">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10" onClick={() => setShowUserMenu(false)}>
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

        {/* Profile Header - Only shown when logged in */}
        {user && (
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
          {/* Order: Dashboard, Feed, Users first, then rest */}
          <div className="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedView('dashboard')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-cyan-500/10 ${selectedView === 'dashboard' ? 'bg-cyan-500/10' : ''}`}
            >
              <Home className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'dashboard' ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'dashboard' ? 'yellow-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Dashboard
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('feed')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-green-500/10 ${selectedView === 'feed' ? 'bg-green-500/10' : ''}`}
            >
              <MessageCircle className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'feed' ? 'text-green-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'feed' ? 'green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Feed
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('users')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-indigo-500/10 ${selectedView === 'users' ? 'bg-indigo-500/10' : ''}`}
            >
              <Users className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'users' ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'users' ? 'indigo-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Users
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('marketplace')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-purple-500/10 ${selectedView === 'marketplace' ? 'bg-purple-500/10' : ''}`}
            >
              <ShoppingBag className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'marketplace' ? 'text-purple-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'marketplace' ? 'purple-green-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Marketplace
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('explore')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-orange-500/10 ${selectedView === 'explore' ? 'bg-orange-500/10' : ''}`}
            >
              <Compass className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'explore' ? 'text-orange-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'explore' ? 'orange-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Explore
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('library')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-blue-500/10 ${selectedView === 'library' ? 'bg-blue-500/10' : ''}`}
            >
              <Library className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'library' ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'library' ? 'blue-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Library
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedView('playlist')}
              className={`flex-shrink-0 transition-all duration-300 hover:bg-pink-500/10 ${selectedView === 'playlist' ? 'bg-pink-500/10' : ''}`}
            >
              <ListMusic className={`w-4 h-4 mr-2 transition-colors duration-300 ${selectedView === 'playlist' ? 'text-pink-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-black transition-all duration-300 ${selectedView === 'playlist' ? 'pink-gradient-text text-transparent bg-clip-text' : 'text-gray-400'}`}>
                Playlist
              </span>
            </Button>
          </div>

          {/* Stats - Only shown when logged in, all 6 boxes same size on one row */}
          {selectedView === 'dashboard' && user && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg"><BarChart3 className="w-4 h-4 text-cyan-400" /></div>
              <div><div className="text-lg font-bold">{userTracks.length + marketTracks.length}</div><div className="text-[10px] text-gray-400">Total Items</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg"><TrendingUp className="w-4 h-4 text-green-400" /></div>
              <div><div className="text-lg font-bold">25+</div><div className="text-[10px] text-gray-400">Blockchains</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded-lg"><Coins className="w-4 h-4 text-purple-400" /></div>
              <div><div className="text-lg font-bold">50+</div><div className="text-[10px] text-gray-400">Cryptocurrencies</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/20 rounded-lg"><Zap className="w-4 h-4 text-orange-400" /></div>
              <div><div className="text-lg font-bold">0.05%</div><div className="text-[10px] text-gray-400">Fee</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-yellow-500/20 rounded-lg"><Globe className="w-4 h-4 text-yellow-400" /></div>
              <div><div className="text-lg font-bold">Polygon</div><div className="text-[10px] text-gray-400">Network</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-3 flex items-center gap-2">
              <div className="p-1.5 bg-pink-500/20 rounded-lg"><Rocket className="w-4 h-4 text-pink-400" /></div>
              <div><div className="text-lg font-bold">Live</div><div className="text-[10px] text-gray-400">Status</div></div>
            </CardContent></Card>
          </div>
          )}

          {/* Dashboard View */}
          {selectedView === 'dashboard' && (
          <>
          {/* Filters */}
          <Card className="retro-card mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Scrollable tabs container on mobile */}
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-1 px-1 flex-shrink-0">
                  {(['tracks', 'nft', 'token', 'bundle'] as const).map((type) => {
                    const isActive = selectedPurchaseType === type
                    const config = {
                      tracks: { icon: Music, gradient: 'yellow-gradient-text', iconColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10', hoverBg: 'hover:bg-yellow-500/10', label: 'Tracks' },
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
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search tracks, artists, users..." value={searchQuery} onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // Also update explore search and switch to explore view for deep search
                    if (e.target.value.length >= 2) {
                      setExploreSearchQuery(e.target.value)
                      setSelectedView('explore')
                    }
                  }}
                    className="w-full bg-black/50 border border-cyan-500/30 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400" />
                </div>
                <div className="flex items-center space-x-2">
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
            </CardContent>
          </Card>

          {/* Content */}
          {selectedPurchaseType === 'tracks' && (
            <div className="space-y-6">
              {/* Tracks view mode toggle */}
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
          )}

          {selectedPurchaseType === 'nft' && (
            <>
              {/* All tracks shown as NFT cards - Rarible inspired grid */}
              {userTracks.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="retro-title">NFT Collection ({tracksData?.groupedTracks?.pageInfo?.totalCount || userTracks.length})</h2>
                    {tracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400">Loading...</Badge>}
                  </div>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2' : 'space-y-2'}>
                    {userTracks.map((track: any, index: number) => (
                      <TrackNFTCard
                        key={track.id}
                        track={{
                          ...track,
                          listingItem: marketTracks.find((l: any) => l.track?.id === track.id)?.listingItem || track.listingItem
                        }}
                        onPlay={() => handlePlayTrack(track, index, userTracks)}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                        listView={viewMode === 'list'}
                      />
                    ))}
                  </div>
                  {/* Infinite scroll sentinel + Load More NFTs Button */}
                  <div ref={nftScrollRef} className="h-4" />
                  {(tracksData?.groupedTracks?.pageInfo?.hasNextPage || loadingMore) && (
                    <div className="flex justify-center mt-6">
                      {loadingMore ? (
                        <div className="flex items-center gap-2 text-purple-400">
                          <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full" />
                          <span>Loading more NFTs...</span>
                        </div>
                      ) : (
                        <Button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="retro-button px-8"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Load More NFTs ({(tracksData?.groupedTracks?.pageInfo?.totalCount || 0) - userTracks.length} remaining)
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Card className="retro-card p-8 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-purple-400 opacity-50" />
                  <h3 className="retro-title mb-2">No NFTs Found</h3>
                  <p className="text-gray-400 text-sm">{tracksLoading ? 'Loading NFTs from blockchain...' : 'NFT marketplace is empty. Mint your first music NFT!'}</p>
                </Card>
              )}
            </>
          )}

          {selectedPurchaseType === 'token' && (
            <Card className="retro-card p-8 text-center">
              <Coins className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-50" />
              <h3 className="retro-title mb-2">Token Listings Coming Soon</h3>
              <p className="text-gray-400 text-sm">OGUN and music token listings will be available here. Stay tuned!</p>
            </Card>
          )}

          {selectedPurchaseType === 'bundle' && (
            <Card className="retro-card p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-cyan-400 opacity-50" />
              <h3 className="retro-title mb-2">Bundle Listings Coming Soon</h3>
              <p className="text-gray-400 text-sm">NFT + Token bundles with exclusive perks will be available here. Stay tuned!</p>
            </Card>
          )}
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
                  {/* Real NFT listings from marketplace */}
                  {filteredMarketTracks.filter((t: any) => t.listingItem?.pricePerItem || t.listingItem?.pricePerItemToShow).length > 0 ? (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2' : 'space-y-2'}>
                      {filteredMarketTracks
                        .filter((t: any) => t.listingItem?.pricePerItem || t.listingItem?.pricePerItemToShow)
                        .map((track: any, index: number) => (
                          <TrackNFTCard
                            key={track.id}
                            track={track}
                            onPlay={() => handlePlayTrack(track, index, filteredMarketTracks.filter((t: any) => t.listingItem?.pricePerItem || t.listingItem?.pricePerItemToShow))}
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
                      <p className="text-gray-400 text-sm">NFTs with sale prices will appear here.</p>
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
                <div className="flex gap-2">
                  {exploreUsersLoading && <Badge className="bg-yellow-500/20 text-yellow-400">Loading users...</Badge>}
                  {exploreUsersData?.exploreUsers?.nodes && (
                    <Badge className="bg-green-500/20 text-green-400">
                      {exploreUsersData.exploreUsers.nodes.length} users
                    </Badge>
                  )}
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
                  ) : exploreUsersData?.exploreUsers?.nodes?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                      {exploreUsersData.exploreUsers.nodes.map((profile: any) => {
                        // Check if profile picture is a video/gif
                        const isVideo = profile.profilePicture && /\.(mp4|mov|webm)$/i.test(profile.profilePicture)
                        const isGif = profile.profilePicture && /\.gif$/i.test(profile.profilePicture)

                        return (
                          <Link key={profile.id} href={`/profiles/${profile.userHandle}`}>
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
                  ) : exploreUsersData?.exploreUsers?.nodes?.length > 0 ? (
                    <Card className="retro-card overflow-hidden">
                      <div className="p-4 border-b border-cyan-500/30">
                        <h3 className="retro-title flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                          Top Users by Followers
                        </h3>
                      </div>
                      <div className="divide-y divide-cyan-500/20">
                        {[...exploreUsersData.exploreUsers.nodes]
                          .sort((a: any, b: any) => (b.followerCount || 0) - (a.followerCount || 0))
                          .slice(0, 20)
                          .map((profile: any, index: number) => (
                            <Link key={profile.id} href={`/profiles/${profile.userHandle}`}>
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

          {/* Feed View - Using the same component as /home page */}
          {selectedView === 'feed' && (
            <div style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
              <Posts />
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
                    {exploreUsersData?.exploreUsers?.nodes?.map((user: any) => (
                      <Card key={user.id} className="retro-card p-4 hover:border-cyan-500/50 transition-all">
                        <div className="flex items-start gap-4">
                          {/* Avatar with Online Status */}
                          <div className="relative flex-shrink-0">
                            <Link href={`/${user.userHandle || user.id}`}>
                              <Avatar className="w-16 h-16 border-2 border-cyan-500/30">
                                <AvatarImage src={user.profilePicture || '/default-avatar.png'} alt={user.displayName} className="object-cover" />
                                <AvatarFallback className="bg-gray-700 text-white">{user.displayName?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                            </Link>
                            {/* Online Status Indicator (Green Dot) */}
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full" title="Online"></div>
                          </div>
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/${user.userHandle || user.id}`}>
                              <h3 className="text-white font-bold truncate hover:text-cyan-400 transition-colors flex items-center gap-1">
                                {user.displayName || 'Unknown User'}
                                {user.isVerified && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
                              </h3>
                            </Link>
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

          {/* Library View */}
          {selectedView === 'library' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <h2 className="retro-title text-xl mb-4">Your Library</h2>
                <p className="text-gray-400 mb-6">Your saved tracks, playlists, and purchased NFTs.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="metadata-section p-4 hover:border-blue-500/50 transition-all cursor-pointer">
                    <Heart className="w-8 h-8 text-red-400 mb-2" />
                    <h3 className="font-bold text-white">Liked Tracks</h3>
                    <p className="text-xs text-gray-400">Your favorite songs</p>
                  </Card>
                  <Card className="metadata-section p-4 hover:border-green-500/50 transition-all cursor-pointer">
                    <ListMusic className="w-8 h-8 text-green-400 mb-2" />
                    <h3 className="font-bold text-white">Playlists</h3>
                    <p className="text-xs text-gray-400">Your curated collections</p>
                  </Card>
                </div>
              </Card>
            </div>
          )}

          {/* Playlist View - Ready for OGUN rewards integration */}
          {selectedView === 'playlist' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ListMusic className="w-8 h-8 text-pink-400" />
                  <h2 className="retro-title text-xl">Playlist DEX</h2>
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs">Coming Soon</Badge>
                </div>
                <p className="text-gray-400 mb-6">Create and trade playlists. Earn OGUN rewards for curating fire playlists that others enjoy!</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="metadata-section p-4 text-center">
                    <div className="text-3xl font-bold text-pink-400">🎵</div>
                    <h3 className="font-bold text-white mt-2">Create Playlists</h3>
                    <p className="text-xs text-gray-400">Curate your best tracks</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">💰</div>
                    <h3 className="font-bold text-white mt-2">Earn OGUN</h3>
                    <p className="text-xs text-gray-400">Get rewarded for plays</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center">
                    <div className="text-3xl font-bold text-cyan-400">🔥</div>
                    <h3 className="font-bold text-white mt-2">Trade & Collect</h3>
                    <p className="text-xs text-gray-400">Buy/sell top playlists</p>
                  </Card>
                </div>
                <Button disabled className="retro-button opacity-50 cursor-not-allowed">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Playlist (Coming Soon)
                </Button>
              </Card>
            </div>
          )}

          {/* Wallet View - Comprehensive DEX Wallet Management */}
          {selectedView === 'wallet' && (
            <div className="space-y-6">
              {/* Header Card */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20">
                      <Wallet className="w-8 h-8 text-green-400" />
                    </div>
                    <div>
                      <h2 className="retro-title text-xl">Wallet</h2>
                      <p className="text-gray-400 text-sm">Manage your crypto assets</p>
                    </div>
                  </div>
                  {userWallet && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-400 px-3 py-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full inline-block mr-2 animate-pulse" />
                        Polygon
                      </Badge>
                      <Badge className="bg-green-500/20 text-green-400 px-3 py-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full inline-block mr-2" />
                        ZetaChain
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Default Wallet Selection */}
                <Card className="metadata-section p-4 mb-4 border-yellow-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⚡</span>
                      <h4 className="text-sm font-bold text-white">Default Wallet</h4>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Magic Wallet - Default */}
                    <button className="p-3 rounded-lg border-2 border-cyan-500 bg-cyan-500/10 text-left transition-all hover:bg-cyan-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✨</span>
                        <span className="font-bold text-cyan-400 text-sm">Magic</span>
                      </div>
                      <p className="text-xs text-gray-400">Native wallet</p>
                    </button>
                    {/* WalletConnect (includes MetaMask, Rainbow, Trust, etc.) */}
                    <button className="p-3 rounded-lg border border-gray-700 bg-black/30 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🔗</span>
                        <span className="font-bold text-gray-400 text-sm">WalletConnect</span>
                      </div>
                      <p className="text-xs text-gray-500">300+ wallets</p>
                    </button>
                    {/* Coinbase Wallet */}
                    <button className="p-3 rounded-lg border border-gray-700 bg-black/30 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🔵</span>
                        <span className="font-bold text-gray-400 text-sm">Coinbase</span>
                      </div>
                      <p className="text-xs text-gray-500">Coinbase Wallet</p>
                    </button>
                    {/* ZetaChain */}
                    <button className="p-3 rounded-lg border border-gray-700 bg-black/30 text-left transition-all hover:border-green-500/50 hover:bg-green-500/10 relative">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🟢</span>
                        <span className="font-bold text-gray-400 text-sm">ZetaChain</span>
                      </div>
                      <p className="text-xs text-gray-500">Omnichain</p>
                      <Badge className="absolute -top-2 -right-2 bg-yellow-500/20 text-yellow-400 text-[10px] px-1">Soon</Badge>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Your default wallet is used for transactions, minting, and receiving payments.</p>
                </Card>

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

                {/* Connected Wallets */}
                {userWallet ? (
                  <div className="space-y-3 mb-6">
                    {/* Primary Wallet (Current Session) */}
                    <Card className="metadata-section p-4 border-cyan-500/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white text-lg">✨</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400">Active Wallet</p>
                              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Default</Badge>
                            </div>
                            <p className="font-mono text-cyan-400 text-sm">{userWallet.slice(0, 10)}...{userWallet.slice(-8)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">Polygon</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { navigator.clipboard.writeText(userWallet); }}
                            className="hover:bg-cyan-500/20"
                          >
                            <Copy className="w-4 h-4 text-cyan-400" />
                          </Button>
                          <a href={`https://polygonscan.com/address/${userWallet}`} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="hover:bg-purple-500/20">
                              <ExternalLink className="w-4 h-4 text-purple-400" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </Card>

                    {/* ZetaChain Wallet (Coming Soon) */}
                    <Card className="metadata-section p-4 border-green-500/30 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <span className="text-white text-lg">🟢</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400">ZetaChain Wallet</p>
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Coming Soon</Badge>
                            </div>
                            <p className="font-mono text-gray-500 text-sm">Universal omnichain address</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500/20 text-green-400 text-xs">ZetaChain</Badge>
                          <Button variant="ghost" size="sm" disabled className="opacity-50">
                            <Plus className="w-4 h-4 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400">🚀 ZetaChain integration coming soon! Bridge assets across Bitcoin, Ethereum, BNB, Polygon & more.</p>
                      </div>
                    </Card>

                    {/* WalletConnect (includes MetaMask, Rainbow, Trust, etc.) */}
                    <Card className="metadata-section p-4 border-blue-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-lg">🔗</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400">WalletConnect</p>
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">v2</Badge>
                            </div>
                            <p className="text-gray-400 text-sm">300+ wallets supported</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowWalletModal(true)}
                          className="border-blue-500/50 hover:bg-blue-500/10 text-blue-400"
                        >
                          Connect
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-orange-500/20 rounded text-xs text-orange-400">🦊 MetaMask</span>
                        <span className="px-2 py-1 bg-black/30 rounded text-xs text-gray-500">Rainbow</span>
                        <span className="px-2 py-1 bg-black/30 rounded text-xs text-gray-500">Trust</span>
                        <span className="px-2 py-1 bg-black/30 rounded text-xs text-gray-500">Argent</span>
                        <span className="px-2 py-1 bg-black/30 rounded text-xs text-gray-500">Ledger</span>
                        <span className="px-2 py-1 bg-black/30 rounded text-xs text-gray-500">+300 more</span>
                      </div>
                    </Card>

                    {/* Coinbase Wallet */}
                    <Card className="metadata-section p-4 border-dashed border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                            <span className="text-lg">🔵</span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Coinbase Wallet</p>
                            <p className="text-gray-400 text-sm">Mobile or browser extension</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowWalletModal(true)}
                          className="border-gray-600 hover:border-blue-500/50 hover:bg-blue-500/10"
                        >
                          Connect
                        </Button>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 mb-6">
                    <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Connect your wallet to view assets</p>
                    <Button onClick={() => setShowWalletModal(true)} className="retro-button">
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                )}

                {/* Balance Cards - Real data from Magic wallet */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="metadata-section p-4 text-center hover:border-yellow-500/50 transition-all">
                    <Coins className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">OGUN</p>
                    <p className="text-xl font-bold text-yellow-400">{ogunBalance || '0.00'}</p>
                    <p className="text-xs text-gray-500">≈ $0.00</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-purple-500/50 transition-all">
                    <div className="w-8 h-8 mx-auto mb-2 text-purple-400">
                      <svg viewBox="0 0 38 33" fill="currentColor"><path d="M29.7 16.5l-11.7 6.7-11.7-6.7 11.7-16.5 11.7 16.5zM18 25.2l-11.7-6.7 11.7 16.5 11.7-16.5-11.7 6.7z"/></svg>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">MATIC</p>
                    <p className="text-xl font-bold text-purple-400">{maticBalance || '0.00'}</p>
                    <p className="text-xs text-gray-500">≈ $0.00</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-cyan-500/50 transition-all">
                    <ImageIcon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">NFTs</p>
                    <p className="text-xl font-bold text-cyan-400">{tracksData?.groupedTracks?.pageInfo?.totalCount || 0}</p>
                    <p className="text-xs text-gray-500">Owned</p>
                  </Card>
                  <Card className="metadata-section p-4 text-center hover:border-green-500/50 transition-all">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-1">Total Value</p>
                    <p className="text-xl font-bold text-green-400">$0.00</p>
                    <p className="text-xs text-gray-500">Portfolio</p>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button className="retro-button bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 flex-col h-auto py-4">
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-xs">Buy Crypto</span>
                  </Button>
                  <Button variant="outline" className="border-cyan-500/50 hover:bg-cyan-500/10 flex-col h-auto py-4">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    <span className="text-xs">Send</span>
                  </Button>
                  <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/10 flex-col h-auto py-4">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    <span className="text-xs">Receive</span>
                  </Button>
                  <Button variant="outline" className="border-yellow-500/50 hover:bg-yellow-500/10 flex-col h-auto py-4">
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    <span className="text-xs">Swap</span>
                  </Button>
                </div>
              </Card>

              {/* Buy Crypto Section */}
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Plus className="w-6 h-6 text-green-400" />
                  <h3 className="retro-title text-lg">Buy Crypto</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">Purchase MATIC on Polygon to mint NFTs and pay gas fees.</p>

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
                        <li>• Receive payments in BTC, ETH, BNB, or MATIC</li>
                        <li>• Single wallet address works on all chains</li>
                        <li>• Native Bitcoin NFT support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Transaction History Placeholder */}
              <Card className="retro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                    <h3 className="retro-title text-lg">Recent Activity</h3>
                  </div>
                  {userWallet && (
                    <a href={`https://polygonscan.com/address/${userWallet}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="text-xs text-cyan-400 hover:bg-cyan-500/10">
                        View All <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>

                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No recent transactions</p>
                  <p className="text-xs text-gray-600 mt-1">Your transaction history will appear here</p>
                </div>
              </Card>
            </div>
          )}

          {/* Settings View */}
          {selectedView === 'settings' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <SettingsIcon className="w-8 h-8 text-gray-400" />
                  <h2 className="retro-title text-xl">Settings</h2>
                </div>
                <p className="text-gray-400 mb-6">Manage your account, profile, and preferences.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/settings/name">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Display Name</h3>
                      <p className="text-xs text-gray-400">Update your name</p>
                    </Card>
                  </Link>
                  <Link href="/settings/username">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Username</h3>
                      <p className="text-xs text-gray-400">Change your @handle</p>
                    </Card>
                  </Link>
                  <Link href="/settings/bio">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Bio</h3>
                      <p className="text-xs text-gray-400">Tell your story</p>
                    </Card>
                  </Link>
                  <Link href="/settings/profile-picture">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Profile Picture</h3>
                      <p className="text-xs text-gray-400">Update your avatar</p>
                    </Card>
                  </Link>
                  <Link href="/settings/social-links">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Social Links</h3>
                      <p className="text-xs text-gray-400">Connect your socials</p>
                    </Card>
                  </Link>
                  <Link href="/settings/security">
                    <Card className="metadata-section p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <h3 className="font-bold text-white">Security</h3>
                      <p className="text-xs text-gray-400">2FA and security options</p>
                    </Card>
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {/* Messages View */}
          {selectedView === 'messages' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-400" />
                  <h2 className="retro-title text-xl">Messages</h2>
                </div>
                <p className="text-gray-400 mb-6">Your conversations with other artists and fans.</p>
                <div className="text-center py-8">
                  <MessageCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No messages yet</p>
                  <p className="text-xs text-gray-500 mt-2">Start a conversation by visiting an artist's profile</p>
                </div>
              </Card>
            </div>
          )}

          {/* Notifications View */}
          {selectedView === 'notifications' && (
            <div className="space-y-6">
              <Card className="retro-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-8 h-8 text-yellow-400" />
                  <h2 className="retro-title text-xl">Notifications</h2>
                </div>
                <p className="text-gray-400 mb-6">Stay updated on likes, follows, sales, and more.</p>
                <div className="text-center py-8">
                  <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No new notifications</p>
                  <p className="text-xs text-gray-500 mt-2">You're all caught up!</p>
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
                          <Link href={`/${trackDetailData.track.artistProfileId || trackDetailData.track.artistId}`}>
                            <p className="text-cyan-400 text-lg hover:text-cyan-300 cursor-pointer transition-colors">
                              {trackDetailData.track.artist}
                            </p>
                          </Link>
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

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4">
                          <Button className="retro-button">
                            <Heart className="w-4 h-4 mr-2" />
                            Favorite
                          </Button>
                          <Button variant="outline" className="border-cyan-500/50 hover:bg-cyan-500/10">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                          {trackDetailData.track.price && (
                            <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
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

          {/* Profile View - /dex/profile/[handle] */}
          {selectedView === 'profile' && routeId && (
            <div className="space-y-6 pb-32 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {profileDetailLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-cyan-400">Loading profile...</span>
                </div>
              )}
              {profileDetailError && (
                <Card className="retro-card p-6 text-center">
                  <p className="text-red-400 mb-2">Error loading profile</p>
                  <p className="text-gray-500 text-sm">{profileDetailError.message}</p>
                </Card>
              )}
              {profileDetailData?.profile && (
                <>
                  {/* Back Button */}
                  <Button variant="ghost" onClick={() => router.back()} className="mb-4 hover:bg-cyan-500/10">
                    <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                    Back
                  </Button>

                  {/* Profile Header */}
                  <Card className="retro-card overflow-hidden">
                    {/* Cover Photo */}
                    <div className="h-48 bg-gradient-to-r from-purple-600 to-cyan-600 relative">
                      {profileDetailData.profile.coverPicture && (
                        <img
                          src={profileDetailData.profile.coverPicture}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Profile Info */}
                    <div className="p-6 -mt-16 relative">
                      <Avatar className="w-32 h-32 border-4 border-gray-900 mb-4">
                        <AvatarImage src={profileDetailData.profile.profilePicture || ''} />
                        <AvatarFallback className="text-4xl bg-gray-800">
                          {profileDetailData.profile.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-white">{profileDetailData.profile.displayName}</h1>
                            {profileDetailData.profile.verified && (
                              <BadgeCheck className="w-6 h-6 text-cyan-400" />
                            )}
                            {profileDetailData.profile.teamMember && (
                              <SoundchainGoldLogo className="w-6 h-6" />
                            )}
                          </div>
                          <p className="text-cyan-400 mb-2">@{profileDetailData.profile.userHandle}</p>
                          {profileDetailData.profile.bio && (
                            <p className="text-gray-300 max-w-xl mb-4">{profileDetailData.profile.bio}</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4 md:mt-0">
                          {me?.profile?.id !== profileDetailData.profile.id && (
                            <>
                              <Button
                                onClick={() => handleFollowToggle(
                                  profileDetailData.profile!.id,
                                  profileDetailData.profile!.isFollowed || false,
                                  profileDetailData.profile!.userHandle || ''
                                )}
                                disabled={followLoading || unfollowLoading}
                                className={profileDetailData.profile.isFollowed ? 'bg-gray-700 hover:bg-gray-600' : 'retro-button'}
                              >
                                <Users className="w-4 h-4 mr-2" />
                                {profileDetailData.profile.isFollowed ? 'Following' : 'Follow'}
                              </Button>
                              <Button variant="outline" className="border-cyan-500/50 hover:bg-cyan-500/10">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 mt-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-white">{profileDetailData.profile.followerCount || 0}</div>
                          <div className="text-xs text-gray-400">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-white">{profileDetailData.profile.followingCount || 0}</div>
                          <div className="text-xs text-gray-400">Following</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Social Links */}
                  {profileDetailData.profile.socialMedias && (
                    <Card className="retro-card">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4">Social Links</h2>
                        <div className="flex flex-wrap gap-3">
                          {profileDetailData.profile.socialMedias.twitter && (
                            <a href={profileDetailData.profile.socialMedias.twitter} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="border-blue-500/50 hover:bg-blue-500/10">
                                Twitter
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </a>
                          )}
                          {profileDetailData.profile.socialMedias.instagram && (
                            <a href={profileDetailData.profile.socialMedias.instagram} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="border-pink-500/50 hover:bg-pink-500/10">
                                Instagram
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </a>
                          )}
                          {profileDetailData.profile.socialMedias.spotify && (
                            <a href={profileDetailData.profile.socialMedias.spotify} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="border-green-500/50 hover:bg-green-500/10">
                                Spotify
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </a>
                          )}
                          {profileDetailData.profile.socialMedias.soundcloud && (
                            <a href={profileDetailData.profile.socialMedias.soundcloud} target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm" className="border-orange-500/50 hover:bg-orange-500/10">
                                SoundCloud
                                <ExternalLink className="w-3 h-3 ml-2" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Favorite Genres */}
                  {(profileDetailData.profile.favoriteGenres?.length ?? 0) > 0 && (
                    <Card className="retro-card">
                      <CardContent className="p-6">
                        <h2 className="retro-title text-lg mb-4">Favorite Genres</h2>
                        <div className="flex flex-wrap gap-2">
                          {profileDetailData.profile.favoriteGenres?.map((genre) => (
                            <Badge key={genre} className="bg-purple-500/20 text-purple-400">{genre}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
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
      <BackendPanel
        isOpen={showBackendPanel}
        onClose={() => setShowBackendPanel(false)}
        totalTracks={tracksData?.groupedTracks?.pageInfo?.totalCount}
        totalListings={listingData?.listingItems?.pageInfo?.totalCount}
      />
    </div>
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
                <div id="modals"></div>
              </TrackProvider>
            </AudioPlayerProvider>
          </LayoutContextProvider>
        </HideBottomNavBarProvider>
      </StateProvider>
    </ModalProvider>
  )
}

// Required for optional catch-all route to work at /dex (base path)
// Without this, Next.js only generates static paths and /dex returns 404
export const getServerSideProps: GetServerSideProps = async () => {
  // Return empty props - the page handles routing client-side via useRouter
  return {
    props: {},
  }
}

export default DEXDashboard
