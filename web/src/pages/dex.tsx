import React, { useState, useMemo, useCallback, ReactElement, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
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
import { NFTCard } from '../components/dex/NFTCard'
import { TokenCard } from '../components/dex/TokenCard'
import { BundleCard } from '../components/dex/BundleCard'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar'
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import { useAudioPlayerContext, Song } from '../hooks/useAudioPlayer'
import { useMeQuery, useGroupedTracksQuery, useTracksQuery, useListingItemsQuery, useExploreUsersQuery, useExploreTracksQuery, useFollowProfileMutation, useUnfollowProfileMutation, SortTrackField, SortOrder } from 'lib/graphql'
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

// Backend Tab Component - API/Aggregator View
function BackendPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  const aggregatorStats = [
    { label: 'NFTs Indexed', value: '2.4M', change: '+12.4%' },
    { label: 'Tokens Tracked', value: '847K', change: '+8.7%' },
    { label: 'Chains Connected', value: '25+', change: '0%' },
    { label: 'API Requests/min', value: '45.2K', change: '+15.2%' },
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

function DEXDashboard() {
  const router = useRouter()

  // Legacy UI Modal Hooks
  const { dispatchShowCreateModal } = useModalDispatch()
  const me = useMe()
  const { isMinting } = useHideBottomNavBar()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  // Start with marketplace view for non-logged-in users, dashboard for logged-in users
  const [selectedView, setSelectedView] = useState<'marketplace' | 'feed' | 'dashboard' | 'explore' | 'library' | 'playlist'>('dashboard')
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'tracks' | 'nft' | 'token' | 'bundle'>('tracks')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showBackendPanel, setShowBackendPanel] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [profileImageError, setProfileImageError] = useState(false)
  const [coverImageError, setCoverImageError] = useState(false)
  const [exploreSearchQuery, setExploreSearchQuery] = useState('')
  const [exploreTab, setExploreTab] = useState<'tracks' | 'users'>('users')

  // Audio Player Context
  const { play, playlistState, isPlaying, currentSong, togglePlay } = useAudioPlayerContext()

  // Create+ Button Handler (Legacy UI Pattern)
  const handleCreateClick = () => {
    me ? dispatchShowCreateModal(true) : router.push('/login')
  }

  // Logout handler
  const onLogout = async () => {
    await setJwt()
    router.reload()
  }

  // Real SoundChain data - YOUR profile
  const { data: userData, loading: userLoading, error: userError } = useMeQuery({
    ssr: false,
    fetchPolicy: 'cache-and-network',
  })

  // Fetch ALL unique tracks (618 tracks from 8,236 NFT editions) with pagination
  const { data: tracksData, loading: tracksLoading, error: tracksError, refetch: refetchTracks, fetchMore: fetchMoreTracks } = useGroupedTracksQuery({
    variables: {
      filter: {}, // Empty filter to get ALL tracks
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: 50 }, // Start with 50 tracks (API max)
    },
    skip: false, // Always fetch
    fetchPolicy: 'cache-and-network', // Use cache but also fetch fresh
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
            first: 50,
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

  // CRITICAL DEBUG: Log raw GraphQL response
  useEffect(() => {
    console.log('🔍 TRACKS QUERY DEBUG:', {
      loading: tracksLoading,
      error: tracksError,
      hasData: !!tracksData,
      totalCount: tracksData?.groupedTracks?.pageInfo?.totalCount,
      nodesLength: tracksData?.groupedTracks?.nodes?.length,
      rawData: tracksData,
    })
    if (tracksError) {
      console.error('🚨 TRACKS ERROR DETAILS:', tracksError)
      console.error('🚨 ERROR GRAPHQL ERRORS:', tracksError.graphQLErrors)
      console.error('🚨 ERROR NETWORK ERROR:', tracksError.networkError)
    }
    if (tracksData?.groupedTracks?.nodes) {
      console.log('✅ TRACKS LOADED:', tracksData.groupedTracks.nodes.length, 'tracks')
      console.log('✅ FIRST 3 TRACKS:', tracksData.groupedTracks.nodes.slice(0, 3))
    }
  }, [tracksData, tracksLoading, tracksError])

  // Fetch all listing items for marketplace with pagination
  const { data: listingData, loading: listingLoading, error: listingError, fetchMore: fetchMoreListings } = useListingItemsQuery({
    variables: { page: { first: 50 }, sort: SelectToApolloQuery[SortListingItem.CreatedAt], filter: {} },
    ssr: false,
    fetchPolicy: 'cache-and-network',
  })

  // Load more listings
  const [loadingMoreListings, setLoadingMoreListings] = useState(false)
  const handleLoadMoreListings = useCallback(async () => {
    if (!listingData?.listingItems?.pageInfo?.hasNextPage || loadingMoreListings) return
    setLoadingMoreListings(true)
    try {
      await fetchMoreListings({
        variables: {
          page: { first: 50, after: listingData.listingItems.pageInfo.endCursor },
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

  // Explore Users Query - search for users/profiles
  const { data: exploreUsersData, loading: exploreUsersLoading } = useExploreUsersQuery({
    variables: { search: exploreSearchQuery || '', page: { first: 50 } },
    skip: selectedView !== 'explore',
    fetchPolicy: 'cache-and-network',
  })

  // Explore Tracks Query - search for tracks
  const { data: exploreTracksData, loading: exploreTracksLoading } = useExploreTracksQuery({
    variables: { search: exploreSearchQuery || '', page: { first: 50 } },
    skip: selectedView !== 'explore',
    fetchPolicy: 'cache-and-network',
  })

  // Follow/Unfollow mutations
  const [followProfile, { loading: followLoading }] = useFollowProfileMutation()
  const [unfollowProfile, { loading: unfollowLoading }] = useUnfollowProfileMutation()

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

  useEffect(() => {
    if (listingError) {
      console.error('❌ useListingItemsQuery Error:', listingError)
    }
  }, [listingError])

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

  // Debug logging - Enhanced (ALWAYS LOG)
  if (typeof window !== 'undefined') {
    console.log('🎵 DEX Dashboard Data:', {
      userLoading: userLoading,
      tracksLoading: tracksLoading,
      listingLoading: listingLoading,
      userError: userError?.message,
      tracksError: tracksError?.message,
      listingError: listingError?.message,
      userLoaded: !!userData?.me,
      profileLoaded: !!user,
      userId: userData?.me?.id,
      profileId: user?.id,
      displayName: user?.displayName,
      userHandle: user?.userHandle,
      profilePicture: user?.profilePicture,
      coverPicture: user?.coverPicture,
      followerCount: user?.followerCount,
      followingCount: user?.followingCount,
      verified: user?.verified,
      userTracksCount: userTracks.length,
      marketTracksCount: marketTracks.length,
      userWallet: userWallet,
      rawUserData: userData,
      rawUser: user,
    })

    // Log actual track data to see artwork URLs
    if (userTracks.length > 0) {
      console.log('🎨 User Tracks with Artwork:', userTracks.map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        artworkUrl: t.artworkUrl,
        playbackUrl: t.playbackUrl,
        hasListingItem: !!t.listingItem,
      })))
    }
    if (marketTracks.length > 0) {
      console.log('🛒 Market Tracks with Artwork:', marketTracks.slice(0, 5).map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        artworkUrl: t.artworkUrl,
        playbackUrl: t.playbackUrl,
        price: t.listingItem?.price,
      })))
    }

    // Log any errors
    if (userError) {
      console.error('❌ User query error:', userError)
    }
    if (tracksError) {
      console.error('❌ Tracks query error:', tracksError)
    }
    if (listingError) {
      console.error('❌ Listing query error:', listingError)
    }
    if (!userData && !userLoading && !userError) {
      console.error('❌ User data failed to load with no error! This is unexpected.')
    }
  }

  const handlePlayTrack = useCallback((track: any, index: number, tracks: any[]) => {
    const playlist: Song[] = tracks.map(t => ({
      trackId: t.id,
      src: t.playbackUrl || '',
      title: t.title,
      artist: t.artist,
      art: t.artworkUrl || '',
      isFavorite: t.isFavorite,
    }))
    playlistState(playlist, index)
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

              {/* Notifications Bell - Links to /notifications like Legacy UI */}
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="relative hover:bg-cyan-500/10">
                  <Bell className="w-5 h-5" />
                  {user?.unreadNotificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {user.unreadNotificationCount}
                    </Badge>
                  )}
                </Button>
              </Link>

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
                  onClick={() => setShowUserMenu(!showUserMenu)}
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
                            <Link href="/notifications">
                              <Button variant="ghost" className="w-full justify-start text-sm hover:bg-cyan-500/10 relative" onClick={() => setShowUserMenu(false)}>
                                <Bell className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">Alerts</span>
                                {user.unreadNotificationCount > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">{user.unreadNotificationCount}</Badge>
                                )}
                              </Button>
                            </Link>
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

        {/* Profile Header - REAL USER DATA */}
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

        {/* Main Content */}
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-8">
          {/* View Tabs - LEGACY UI PATTERN WITH GRADIENT TEXT */}
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

          {/* Stats */}
          {selectedView === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="retro-card"><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg"><BarChart3 className="w-5 h-5 text-cyan-400" /></div>
              <div><div className="text-2xl font-bold">{userTracks.length + marketTracks.length}</div><div className="text-xs text-gray-400">Total Items</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-green-400" /></div>
              <div><div className="text-2xl font-bold">25+</div><div className="text-xs text-gray-400">Blockchains</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg"><Coins className="w-5 h-5 text-purple-400" /></div>
              <div><div className="text-2xl font-bold">50+</div><div className="text-xs text-gray-400">Cryptocurrencies</div></div>
            </CardContent></Card>
            <Card className="retro-card"><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg"><Zap className="w-5 h-5 text-orange-400" /></div>
              <div><div className="text-2xl font-bold">0.05%</div><div className="text-xs text-gray-400">Fee</div></div>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="retro-title">All Tracks ({tracksData?.groupedTracks?.pageInfo?.totalCount || userTracks.length})</h2>
                <div className="flex gap-2">
                  {tracksLoading && <Badge className="bg-yellow-500/20 text-yellow-400">Loading...</Badge>}
                  {tracksError && (
                    <Badge className="bg-red-500/20 text-red-400 cursor-pointer"
                      title={JSON.stringify(tracksError, null, 2)}>
                      Error: {tracksError.message} (click for details)
                    </Badge>
                  )}
                  {!tracksLoading && !tracksError && userTracks.length === 0 && (
                    <Badge className="bg-blue-500/20 text-blue-400">API has {tracksData?.groupedTracks?.pageInfo?.totalCount || 0} tracks but none displayed - check console!</Badge>
                  )}
                  {!tracksLoading && !tracksError && userTracks.length > 0 && (
                    <Badge className="bg-green-500/20 text-green-400">✅ Loaded {userTracks.length} tracks</Badge>
                  )}
                </div>
              </div>
              {tracksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-cyan-400">Loading your tracks...</div>
                </div>
              ) : userTracks.length === 0 ? (
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
              ) : (
                <>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                    {userTracks.map((track: any, index: number) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        onPlay={() => handlePlayTrack(track, index, userTracks)}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                      />
                    ))}
                  </div>
                  {/* Load More Button */}
                  {tracksData?.groupedTracks?.pageInfo?.hasNextPage && (
                    <div className="flex justify-center mt-6">
                      <Button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="retro-button px-8"
                      >
                        {loadingMore ? (
                          <>Loading...</>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Load More Tracks ({tracksData?.groupedTracks?.pageInfo?.totalCount - userTracks.length} remaining)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {marketTracks.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <h2 className="retro-title">Marketplace Tracks ({listingData?.listingItems?.pageInfo?.totalCount || marketTracks.length})</h2>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                    {marketTracks.map((track: any, index: number) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        onPlay={() => handlePlayTrack(track, index, marketTracks)}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentSong?.trackId === track.id}
                      />
                    ))}
                  </div>
                  {/* Load More Marketplace Button */}
                  {listingData?.listingItems?.pageInfo?.hasNextPage && (
                    <div className="flex justify-center mt-6">
                      <Button
                        onClick={handleLoadMoreListings}
                        disabled={loadingMoreListings}
                        className="retro-button px-8"
                      >
                        {loadingMoreListings ? 'Loading...' : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Load More ({(listingData?.listingItems?.pageInfo?.totalCount || 0) - marketTracks.length} remaining)
                          </>
                        )}
                      </Button>
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
                    {userTracks.map((track: any) => {
                      // Check if track has active listing for price
                      const listing = marketTracks.find((l: any) => l.track?.id === track.id)
                      const priceValue = listing?.pricePerItemToShow || listing?.pricePerItem || track.price?.value || 0
                      const currency = listing?.acceptsOGUN ? 'OGUN' : track.price?.currency || 'MATIC'
                      const isListed = !!listing
                      return (
                        <NFTCard
                          key={track.id}
                          nft={{
                            id: track.id,
                            name: track.title || 'Untitled',
                            collection: track.artist || 'SoundChain',
                            tokenId: track.nftData?.tokenId || track.id,
                            chainId: 137, // Polygon
                            price: { value: parseFloat(priceValue) || 0, currency },
                            usdPrice: parseFloat(priceValue) * 0.5, // Estimate
                            image: track.artworkUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
                            rarity: track.playbackCount > 1000 ? 'legendary' : track.playbackCount > 100 ? 'epic' : track.playbackCount > 10 ? 'rare' : 'common' as const,
                            attributes: [
                              { trait_type: 'Plays', value: track.playbackCountFormatted || '0' },
                              { trait_type: 'Favorites', value: track.favoriteCount || 0 },
                              { trait_type: 'Genre', value: track.genres?.[0] || 'Music' },
                              ...(isListed ? [{ trait_type: 'Status', value: 'FOR SALE' }] : []),
                            ],
                            creator: track.nftData?.minter || track.artistId || '',
                            owner: track.nftData?.owner || '',
                          }}
                          onPurchase={() => {}}
                          isWalletConnected={isWalletConnected}
                          listView={viewMode === 'list'}
                        />
                      )
                    })}
                  </div>
                  {/* Load More NFTs Button */}
                  {tracksData?.groupedTracks?.pageInfo?.hasNextPage && (
                    <div className="flex justify-center mt-6">
                      <Button
                        onClick={() => fetchMoreTracks({ variables: { page: { first: 50, after: tracksData?.groupedTracks?.pageInfo?.endCursor } } })}
                        disabled={tracksLoading}
                        className="retro-button px-8"
                      >
                        {tracksLoading ? 'Loading...' : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Load More NFTs ({(tracksData?.groupedTracks?.pageInfo?.totalCount || 0) - userTracks.length} remaining)
                          </>
                        )}
                      </Button>
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
                </div>
              </Card>

              {selectedPurchaseType === 'tracks' && marketTracks.length > 0 && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                  {marketTracks.map((track: any, index: number) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      onPlay={() => handlePlayTrack(track, index, marketTracks)}
                      isPlaying={isPlaying}
                      isCurrentTrack={currentSong?.trackId === track.id}
                    />
                  ))}
                </div>
              )}

              {selectedPurchaseType === 'nft' && (
                <>
                  {/* Real NFT listings from marketplace */}
                  {filteredMarketTracks.filter((t: any) => t.listingItem?.price).length > 0 ? (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2' : 'space-y-2'}>
                      {filteredMarketTracks
                        .filter((t: any) => t.listingItem?.price)
                        .map((track: any) => (
                          <NFTCard
                            key={track.id}
                            nft={{
                              id: track.id,
                              name: track.title,
                              collection: track.artist || 'SoundChain',
                              tokenId: track.id,
                              chainId: 137,
                              price: { value: parseFloat(track.listingItem?.price || 0), currency: track.listingItem?.acceptsOGUN ? 'OGUN' : 'MATIC' },
                              usdPrice: parseFloat(track.listingItem?.price || 0) * 0.5,
                              image: track.artworkUrl || '',
                              rarity: 'rare' as const,
                              attributes: [],
                              creator: track.artistWallet || '',
                              owner: track.ownerWallet || '',
                            }}
                            onPurchase={() => {}}
                            isWalletConnected={isWalletConnected}
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

              {selectedPurchaseType === 'tracks' && marketTracks.length === 0 && (
                <Card className="retro-card p-12 text-center">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-cyan-400 opacity-50" />
                  <h3 className="retro-title text-lg mb-2">No tracks listed for sale</h3>
                  <p className="text-gray-400 mb-4">Be the first to list a track on the marketplace!</p>
                  <Button onClick={handleCreateClick} className="retro-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload & List Track
                  </Button>
                </Card>
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
                    Users ({exploreUsersData?.exploreUsers?.pageInfo?.totalCount || 0})
                  </Button>
                  <Button
                    onClick={() => setExploreTab('tracks')}
                    className={`px-4 py-2 rounded-lg transition-all ${exploreTab === 'tracks' ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Tracks ({exploreTracksData?.exploreTracks?.pageInfo?.totalCount || 0})
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
      <BackendPanel isOpen={showBackendPanel} onClose={() => setShowBackendPanel(false)} />
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
              </TrackProvider>
            </AudioPlayerProvider>
          </LayoutContextProvider>
        </HideBottomNavBarProvider>
      </StateProvider>
    </ModalProvider>
  )
}

export default DEXDashboard
