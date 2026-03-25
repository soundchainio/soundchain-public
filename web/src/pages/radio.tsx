/**
 * OGUN Radio - Live NFT Music Player
 * 24/7 Infinite Shuffle - Just tune in and listen
 * Tap anywhere to start (browser requirement)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

const RadioScene4D = dynamic(() => import('components/RadioScene4D'), { ssr: false })
// CreateModal requires MagicContext + UnifiedWallet providers (not on radio page)
// Upload button navigates to /dex/feed with create modal trigger instead
import { GetServerSideProps } from 'next'
import { initializeApollo } from 'lib/apollo'
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Music,
  ExternalLink,
  Shuffle,
  ArrowLeft,
  PiggyBank,
  Users,
  X,
  Coins,
  Headphones,
  Wallet,
  Zap,
  Share2,
  Link2,
  Check,
  Twitter
} from 'lucide-react'
import { Logo } from 'icons/Logo'
import { useLogStream } from 'hooks/useLogStream'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import { gql, useQuery } from '@apollo/client'
import { toast, ToastContainer } from 'react-toastify'
import { OgunRewardToast, DailyLimitToast } from 'components/common/OgunRewardToast'
import { Card } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { ConcertChat } from 'components/dex/ConcertChat'
import { useModalDispatch, ModalProvider } from 'contexts/ModalContext'
import { useRadioOptional } from 'contexts/RadioContext'
import 'react-toastify/dist/ReactToastify.css'
import { ReactElement } from 'react'
import { CustomLayout } from './_app'
import { CreateStoryModal } from 'components/dex/CreateStoryModal'

// GraphQL queries for PiggyBank rewards data
const PROFILE_STREAMING_REWARDS_QUERY = gql`
  query RadioProfileStreamingRewards($profileId: String!) {
    scidsByProfile(profileId: $profileId) {
      id
      scid
      streamCount
      ogunRewardsEarned
      ogunRewardsClaimed
    }
  }
`

const MY_LISTENER_REWARDS_QUERY = gql`
  query RadioMyListenerRewards {
    myListenerRewards {
      dailyEarned
      totalEarned
      dailyLimit
      tracksStreamedToday
    }
  }
`

interface RadioTrack {
  id: string
  title: string
  artist: string
  album?: string
  artwork_url?: string
  stream_url?: string
  play_count: number
  is_nft: boolean
  genres?: string[]
}

interface RadioGenre {
  key: string
  label: string
  count: number
}

// GraphQL query for fetching track data server-side (for OG previews)
const GET_TRACK_FOR_OG = gql`
  query GetTrackForOG($trackId: String!) {
    track(id: $trackId) {
      id
      title
      artworkUrl
      playbackUrl
      profile {
        displayName
        handle
      }
    }
  }
`

interface OGUNRadioProps {
  initialTrack?: {
    id: string
    title: string
    artist: string
    artwork_url: string
  } | null
  trackId?: string
}

// Server-side props for OG meta tags - social crawlers need this!
export const getServerSideProps: GetServerSideProps<OGUNRadioProps> = async (context) => {
  const trackId = context.query.track as string | undefined

  if (!trackId) {
    return { props: { initialTrack: null } }
  }

  try {
    const apolloClient = initializeApollo()
    const { data } = await apolloClient.query({
      query: GET_TRACK_FOR_OG,
      variables: { trackId },
    })

    if (data?.track) {
      const track = data.track
      // Transform IPFS URLs to HTTPS gateway URLs for OG images
      let artworkUrl = track.artworkUrl || ''
      if (artworkUrl.startsWith('ipfs://')) {
        artworkUrl = `https://soundchain.mypinata.cloud/ipfs/${artworkUrl.replace('ipfs://', '')}`
      }

      return {
        props: {
          initialTrack: {
            id: track.id,
            title: track.title || 'Unknown Track',
            artist: track.profile?.displayName || track.profile?.handle || 'Unknown Artist',
            artwork_url: artworkUrl,
          },
          trackId,
        },
      }
    }
  } catch (err) {
    console.error('Failed to fetch track for OG:', err)
  }

  return { props: { initialTrack: null, trackId } }
}

export default function OGUNRadio({ initialTrack, trackId: initialTrackId }: OGUNRadioProps) {
  const router = useRouter()
  const { dispatchShowCreateModal } = useModalDispatch()
  const globalRadio = useRadioOptional()
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showUploadAccordion, setShowUploadAccordion] = useState(true) // Open by default
  const [isLoading, setIsLoading] = useState(true)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queueLength, setQueueLength] = useState(0)
  const [totalTracks, setTotalTracks] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [needsInteraction, setNeedsInteraction] = useState(true)

  // Header dropdown modal states (shown when logged in)
  const [showWinWinStatsModal, setShowWinWinStatsModal] = useState(false)
  const [showVibesModal, setShowVibesModal] = useState(false)
  const [showNearbyModal, setShowNearbyModal] = useState(false)
  const [winWinRewardsTab, setWinWinRewardsTab] = useState<'catalog' | 'listener'>('catalog')

  const [showShareStoryModal, setShowShareStoryModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Genre channels (XM Radio style)
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [availableGenres, setAvailableGenres] = useState<RadioGenre[]>([])
  const [genreTrackCount, setGenreTrackCount] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const streamLoggedForCurrentPlay = useRef(false)

  // Auth + wallet for OGUN streaming rewards and header icons
  const me = useMe()
  const { account: walletAddress } = useMagicContext()

  // Fetch streaming rewards data for PiggyBank (only when logged in)
  const { data: myStreamingRewardsData, loading: myStreamingRewardsLoading } = useQuery(PROFILE_STREAMING_REWARDS_QUERY, {
    variables: { profileId: me?.profile?.id || '' },
    skip: !me?.profile?.id,
    fetchPolicy: 'cache-first',
  })

  const { data: myListenerRewardsData, loading: myListenerRewardsLoading } = useQuery(MY_LISTENER_REWARDS_QUERY, {
    skip: !me,
    fetchPolicy: 'cache-and-network',
  })

  const myTotalOgunEarned = useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => total + (scid.ogunRewardsEarned || 0), 0)
  }, [myStreamingRewardsData])

  const myTotalStreams = useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => total + (scid.streamCount || 0), 0)
  }, [myStreamingRewardsData])

  const myTotalUnclaimed = useMemo(() => {
    if (!myStreamingRewardsData?.scidsByProfile) return 0
    return myStreamingRewardsData.scidsByProfile.reduce((total: number, scid: any) => {
      const earned = scid.ogunRewardsEarned || 0
      const claimed = scid.ogunRewardsClaimed || 0
      return total + Math.max(0, earned - claimed)
    }, 0)
  }, [myStreamingRewardsData])

  // OGUN Stream logging - WIN-WIN rewards for creators and listeners
  const { logStream, startTracking } = useLogStream({
    minDuration: 30,
    onReward: (reward) => {
      if (reward > 0) {
        toast(<OgunRewardToast amount={reward} trackTitle={currentTrack?.title} />, {
          position: 'bottom-right',
          autoClose: 4000,
          hideProgressBar: true,
          className: 'ogun-reward-toast',
          bodyClassName: 'ogun-reward-toast-body',
        })
      }
    },
    onDailyLimitReached: () => {
      toast(<DailyLimitToast trackTitle={currentTrack?.title} />, {
        position: 'bottom-right',
        autoClose: 4000,
        className: 'ogun-limit-toast',
      })
    },
  })

  // Fetch current track from OGUN Radio
  const fetchCurrentTrack = async (genre?: string) => {
    try {
      const genreParam = genre || selectedGenre
      const url = genreParam && genreParam !== 'all' ? `/api/agent/radio?genre=${genreParam}` : '/api/agent/radio'
      const res = await fetch(url)
      const data = await res.json()

      if (data.success && data.data?.now_playing) {
        setCurrentTrack(data.data.now_playing)
        setQueueLength(data.data.queue_length || 0)
        setTotalTracks(data.data.total_tracks || data.data.queue_length || 0)
        if (data.data.available_genres) setAvailableGenres(data.data.available_genres)
        if (data.data.genre_track_count !== undefined) setGenreTrackCount(data.data.genre_track_count)
        setError(null)
      } else {
        setError('No tracks available')
      }
    } catch (e) {
      setError('Failed to connect to OGUN Radio')
    } finally {
      setIsLoading(false)
    }
  }

  // Skip to next track (genre-aware)
  const skipToNext = async () => {
    try {
      if (selectedGenre && selectedGenre !== 'all') {
        // Genre mode: just fetch a new track from the genre
        await fetchCurrentTrack(selectedGenre)
      } else {
        // All tracks mode: advance the global playlist
        await fetch('/api/agent/radio', { method: 'POST' })
        await fetchCurrentTrack()
      }
    } catch (e) {
      setError('Failed to skip track')
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchCurrentTrack()
  }, [])

  // Try autoplay when track loads, handle browser blocking
  useEffect(() => {
    if (currentTrack?.stream_url && audioRef.current) {
      // Reset stream logging for new track
      streamLoggedForCurrentPlay.current = false
      if (currentTrack.id) {
        startTracking(currentTrack.id)
      }

      audioRef.current.src = currentTrack.stream_url
      audioRef.current.load()

      // Always try to play
      audioRef.current.play()
        .then(() => {
          setNeedsInteraction(false)
          setIsPlaying(true)
        })
        .catch(() => {
          // Browser blocked autoplay - need user gesture
          setNeedsInteraction(true)
          setIsPlaying(false)
        })
    }
  }, [currentTrack])

  // Global click handler - tap anywhere to start
  useEffect(() => {
    if (!needsInteraction) return

    const startPlayback = () => {
      if (audioRef.current && currentTrack?.stream_url) {
        audioRef.current.play()
          .then(() => {
            setNeedsInteraction(false)
            setIsPlaying(true)
          })
          .catch(() => {})
      }
    }

    document.addEventListener('click', startPlayback, { once: true })
    document.addEventListener('touchstart', startPlayback, { once: true })

    return () => {
      document.removeEventListener('click', startPlayback)
      document.removeEventListener('touchstart', startPlayback)
    }
  }, [needsInteraction, currentTrack])

  // Handle play/pause
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack?.stream_url) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {
        setError('Playback failed - try another track')
      })
    }
  }

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Update progress + OGUN stream logging at 30s mark
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)

      // Log stream at 30-second mark for OGUN rewards
      if (
        !streamLoggedForCurrentPlay.current &&
        currentTrack?.id &&
        audioRef.current.currentTime >= 30
      ) {
        streamLoggedForCurrentPlay.current = true
        const playDuration = Math.floor(audioRef.current.currentTime)
        logStream(currentTrack.id, playDuration, walletAddress || undefined, me?.profile?.id)
          .catch(err => console.warn('[OGUN Radio] Failed to log stream:', err))
      }
    }
  }

  // Handle track end - reset stream flag and auto skip to next (infinite loop)
  const handleTrackEnd = () => {
    streamLoggedForCurrentPlay.current = false
    skipToNext()
  }

  // Genre channel change
  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
    fetchCurrentTrack(genre)
  }

  // Share handlers
  const getShareUrl = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://soundchain.io'
    return currentTrack ? `${base}/radio?track=${currentTrack.id}` : `${base}/radio`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setLinkCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { toast.error('Failed to copy link') }
  }

  const handleShareTwitter = () => {
    const text = currentTrack
      ? `Listening to "${currentTrack.title}" by ${currentTrack.artist} on OGUN Radio 🔴 ${totalTracks || 618} tracks streaming 24/7`
      : `Tune in to OGUN Radio 🔴 ${totalTracks || 618} tracks streaming 24/7`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`, '_blank')
    setShowShareMenu(false)
  }

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack ? `${currentTrack.title} - ${currentTrack.artist} | OGUN Radio` : 'OGUN Radio - 24/7 Music',
          text: currentTrack ? `Listen to "${currentTrack.title}" by ${currentTrack.artist} on OGUN Radio` : 'Tune in to OGUN Radio - streaming 24/7',
          url: getShareUrl(),
        })
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink()
    }
    setShowShareMenu(false)
  }

  // Format time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Use initialTrack (SSR) for OG meta, fallback to currentTrack (client)
  const ogTrack = initialTrack || currentTrack
  const ogTitle = ogTrack ? `${ogTrack.title} - ${ogTrack.artist}` : 'OGUN Radio - 24/7 Music'
  const ogDescription = ogTrack
    ? `🎵 ${ogTrack.title} by ${ogTrack.artist}\n\n🔊 Stream Now on SoundChain\n📍 Protocol: IPFS/Pinata P2P\n⛓️ Network: Polygon`
    : `${totalTracks || 618} tracks streaming 24/7 on decentralized IPFS`
  // Ensure artwork URL is a proper HTTPS URL for social previews
  let ogImage = ogTrack?.artwork_url || 'https://soundchain.io/soundchain-meta-logo.png'
  if (ogImage.startsWith('ipfs://')) {
    ogImage = `https://soundchain.mypinata.cloud/ipfs/${ogImage.replace('ipfs://', '')}`
  }

  return (
    <>
      <Head>
        <title>{ogTrack ? `${ogTrack.title} - ${ogTrack.artist} | OGUN Radio` : 'OGUN Radio - 24/7 Music | SoundChain'}</title>
        <meta name="description" content={ogDescription} />

        {/* OpenGraph - Rich previews for Discord, iMessage, Facebook, etc. */}
        <meta property="og:type" content="music.song" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <meta property="og:image:alt" content={ogTrack ? `${ogTrack.title} album artwork` : 'OGUN Radio'} />
        <meta property="og:url" content={`https://soundchain.io/radio${ogTrack ? `?track=${ogTrack.id}` : ''}`} />
        <meta property="og:site_name" content="SoundChain | Decentralized Music Platform" />
        {ogTrack && (
          <>
            <meta property="music:musician" content={ogTrack.artist} />
            <meta property="og:audio" content={currentTrack?.stream_url || ''} />
            <meta property="og:audio:type" content="audio/mpeg" />
          </>
        )}

        {/* Twitter Card - Rich preview for Twitter/X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogTrack ? `Stream "${ogTrack.title}" by ${ogTrack.artist} on OGUN Radio 🎶` : `${totalTracks || 618} tracks streaming 24/7`} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@SoundChainFM" />
        <meta name="twitter:creator" content="@SoundChainFM" />

        {/* Discord-specific (uses OG but prefers these) */}
        <meta name="theme-color" content="#FF6B00" />
        <style>{`body { background: #020810 !important; }`}</style>
      </Head>

      <div className="min-h-screen bg-transparent text-white overflow-x-hidden">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          crossOrigin="anonymous"
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => skipToNext()} // Auto-skip on error
        />

        {/* Tap Anywhere Prompt - minimal, disappears on interaction */}
        {needsInteraction && !isLoading && currentTrack && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 cursor-pointer"
            onClick={() => {
              if (audioRef.current && currentTrack?.stream_url) {
                audioRef.current.play()
                  .then(() => { setNeedsInteraction(false); setIsPlaying(true) })
                  .catch(() => {})
              }
            }}
          >
            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-orange-500/20 blur-2xl animate-pulse" />
                <Radio className="relative w-20 h-20 text-red-500 mx-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" />
              </div>
              <p className="text-3xl font-black text-white mt-6 tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">ENTER THE FREQUENCY</p>
              <p className="text-sm font-mono text-gray-400 mt-2 tracking-widest">TAP ANYWHERE TO TRANSMIT</p>
            </div>
          </div>
        )}

        {/* Modern DEX-style Header */}
        <nav className="backdrop-blur-md bg-black/30 border-b border-white/5 px-2 sm:px-4 py-1.5 sm:py-2 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-9 w-9" />
                <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
                  SoundChain
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              {/* Nearby, PiggyBank, Vibes icons - only when logged in */}
              {me && (
                <div className="flex items-center space-x-0.5 sm:space-x-1">
                  {/* Nearby (Bitchat) */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowNearbyModal(!showNearbyModal); setShowWinWinStatsModal(false); setShowVibesModal(false); }}
                      className="hover:bg-green-500/10 px-2"
                      title="Nearby - Bitchat"
                    >
                      <Radio className="w-5 h-5 text-green-400" />
                    </Button>

                    {showNearbyModal && (
                      <>
                        <div className="fixed inset-0 z-[98] pointer-events-none" />
                        <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[20rem] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:translate-x-0 sm:w-80 z-[99] shadow-2xl border-2 border-green-500/50 bg-gradient-to-b from-neutral-900 via-green-950/10 to-neutral-900 max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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

                  {/* PiggyBank - WIN-WIN Streaming Rewards */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowWinWinStatsModal(!showWinWinStatsModal); setShowNearbyModal(false); setShowVibesModal(false); }}
                      className="hover:bg-pink-500/10 px-2"
                      title="WIN-WIN Streaming Rewards"
                    >
                      <PiggyBank className="w-5 h-5 text-pink-400" />
                    </Button>

                    {showWinWinStatsModal && (
                      <>
                        <div className="fixed inset-0 z-[98] pointer-events-none" />
                        <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[18rem] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:translate-x-0 sm:w-80 z-[99] shadow-2xl max-h-[75vh] overflow-hidden border-2 border-orange-500/50 bg-gradient-to-b from-neutral-900 via-orange-950/10 to-neutral-900" onClick={(e) => e.stopPropagation()}>
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

                          {/* Catalog (Creator) Rewards Tab */}
                          {winWinRewardsTab === 'catalog' && (
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
                          {winWinRewardsTab === 'listener' && (
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
                                  WIN-WIN! Earn 30% when YOU stream tracks
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

                  {/* Vibes - Social Links */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowVibesModal(!showVibesModal); setShowNearbyModal(false); setShowWinWinStatsModal(false); }}
                      className="hover:bg-purple-500/10 px-2"
                      title="Follow Us"
                    >
                      <Users className="w-5 h-5 text-purple-400" />
                    </Button>

                    {showVibesModal && (
                      <>
                        <div className="fixed inset-0 z-[98] pointer-events-none" />
                        <Card className="fixed left-1/2 top-16 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[16rem] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:translate-x-0 sm:w-72 z-[99] shadow-2xl border-2 border-purple-500/50 bg-gradient-to-b from-neutral-900 via-purple-950/10 to-neutral-900" onClick={(e) => e.stopPropagation()}>
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
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-red-400 font-bold text-sm hidden sm:inline">OGUN RADIO</span>
                <span className="text-red-400 font-bold text-sm sm:hidden">LIVE</span>
                {isPlaying && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 hidden sm:inline">LIVE</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Navigation Pills — horizontal scroll bar like dex page */}
        <div className="relative z-10 max-w-4xl mx-auto px-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2">
            {/* Upload Free — special prominent pill */}
            <button
              onClick={() => setShowUploadAccordion(v => !v)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold whitespace-nowrap hover:scale-105 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              🎵 Upload Free
            </button>
            {/* Micro nav pills */}
            {[
              { label: 'Feed', icon: '📱', link: '/dex/feed' },
              { label: 'Explore', icon: '🔍', link: '/dex/explore' },
              { label: 'Marketplace', icon: '🛒', link: '/dex/marketplace' },
              { label: 'Artists', icon: '🎤', link: '/dex/users' },
              { label: 'Playlists', icon: '🎧', link: '/dex/playlists' },
              { label: 'Wallet', icon: '💰', link: '/dex/wallet' },
              { label: 'Staking', icon: '🔒', link: '/dex/wallet' },
              { label: 'Moltbook', icon: '🦞', link: 'https://www.moltbook.com', external: true },
              { label: 'Pulse', icon: '💬', link: '/dex/pulse' },
              { label: 'Library', icon: '📚', link: '/dex/library' },
              { label: 'SCID', icon: '🏆', link: '/dex/wallet' },
            ].map((pill) => (
              <button
                key={pill.label}
                onClick={() => {
                  if (pill.external) {
                    window.open(pill.link, '_blank', 'noopener')
                  } else {
                    if (globalRadio && currentTrack && isPlaying) globalRadio.startRadio()
                    router.push(pill.link)
                  }
                }}
                className="flex-shrink-0 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[9px] font-medium text-gray-300 whitespace-nowrap hover:border-cyan-500/40 hover:text-white transition-all"
              >
                {pill.icon} {pill.label}
              </button>
            ))}
          </div>

          {/* Upload Free Accordion — space station design, open by default */}
          {showUploadAccordion && (
            <div className="mt-2 relative overflow-hidden rounded-xl border border-cyan-500/20" style={{ background: 'linear-gradient(135deg, rgba(0,20,40,0.85) 0%, rgba(0,40,60,0.85) 50%, rgba(10,20,50,0.85) 100%)', backdropFilter: 'blur(12px)' }}>
              {/* Animated scan line */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-pulse" style={{ top: '30%' }} />
                <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent animate-pulse" style={{ top: '70%', animationDelay: '1s' }} />
              </div>

              <div className="relative p-4">
                {/* Close button */}
                <button
                  onClick={() => setShowUploadAccordion(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center border border-cyan-500/30">
                    <span className="text-sm">🎵</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Upload Free — Earn OGUN</h3>
                    <p className="text-[10px] text-cyan-400/70 font-mono">SCID REGISTRATION PORTAL</p>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-xs font-bold text-cyan-400">70%</div>
                    <div className="text-[8px] text-gray-500">Creator</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-xs font-bold text-green-400">30%</div>
                    <div className="text-[8px] text-gray-500">Listener</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-xs font-bold text-yellow-400">$0</div>
                    <div className="text-[8px] text-gray-500">Cost</div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                  Upload your music → get a SoundChain ID (SCID) → every stream earns OGUN rewards on Polygon. No minting fees. No gas. Just music.
                </p>

                {/* Start Upload button — opens CreateModal overlay, keeps accordion open */}
                <button
                  onClick={() => {
                    if (globalRadio && currentTrack && isPlaying) globalRadio.startRadio()
                    router.push('/dex/feed?upload=scid')
                  }}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-[1.02] transition-all border border-cyan-400/20"
                >
                  🚀 Start Upload
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4D Immersive Scene — FULL VIEWPORT fixed background */}
        <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ zIndex: 0 }}>
          <RadioScene4D
            audioRef={audioRef}
            isPlaying={isPlaying}
            artworkUrl={currentTrack?.artwork_url}
            genre={currentTrack?.genres?.[0]}
          />
        </div>

        {/* Main Content — floats over 4D scene */}
        <main className="relative z-10 max-w-4xl mx-auto px-3 md:px-4 pt-0 pb-4">
          {/* Radio Display — fully transparent, floating over 4D scene */}
          <div className="relative p-4 md:p-6" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}>

            {/* Station Header */}
            <div className="text-center mb-3 md:mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full mb-2 border border-white/10">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                <span className="text-xs font-mono font-bold tracking-[0.15em] text-gray-300">
                  {isPlaying ? 'TRANSMITTING' : 'STANDBY'}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                OGUN <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">Radio</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-400 flex items-center justify-center gap-2 mt-1 font-mono">
                {totalTracks || queueLength || '...'} Tracks <Shuffle className="w-3 h-3 text-green-400" /> Infinite Shuffle
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-400">Tuning in...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => fetchCurrentTrack()}
                  className="px-6 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : currentTrack ? (
              <>
                {/* Now Playing */}
                <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 mb-4 md:mb-6">
                  {/* Mini vinyl — top left corner thumbnail */}
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <div className={`relative w-full h-full ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }}>
                      {currentTrack.artwork_url ? (
                        <img
                          src={currentTrack.artwork_url}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover rounded-full border border-white/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900/80 to-purple-900/80 rounded-full flex items-center justify-center border border-white/10">
                          <Music className="w-6 h-6 text-white/50" />
                        </div>
                      )}
                    </div>
                    {/* Center hole */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 rounded-full bg-black/60 border border-white/20" />
                    </div>
                    {currentTrack.is_nft && (
                      <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[8px] font-bold rounded-full">
                        NFT
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-1 line-clamp-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      {currentTrack.title}
                    </h2>
                    <p className="text-base md:text-lg text-gray-300/80 mb-1">{currentTrack.artist}</p>
                    {currentTrack.genres && currentTrack.genres.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-3">
                        {currentTrack.genres.slice(0, 3).map((g) => {
                          const genreInfo = availableGenres.find(ag => ag.key === g)
                          return (
                            <button
                              key={g}
                              onClick={() => handleGenreChange(g)}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-900/40 text-cyan-400 border border-cyan-800/30 hover:bg-cyan-800/50 transition-colors"
                            >
                              {genreInfo?.label || g}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {currentTrack.album && (
                      <p className="text-sm text-gray-500 mb-2">Album: {currentTrack.album}</p>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {currentTrack.play_count} plays
                      </span>
                      <span>{totalTracks || queueLength} Tracks</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar — neon EQ style */}
                <div className="mb-3 md:mb-5">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 transition-all duration-200 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                      style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 md:gap-6">
                  {/* Volume */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    disabled={!currentTrack.stream_url}
                    className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>

                  {/* Skip */}
                  <button
                    onClick={skipToNext}
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center justify-center gap-3 mt-2 md:mt-4">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Track Link + Share Options */}
                <div className="mt-4 md:mt-8 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                  <Link
                    href={`/dex/track/${currentTrack.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    View Track Details
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setShowShareStoryModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm text-white font-medium transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Share2 className="w-4 h-4" />
                    Share to Story
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Share
                    </button>
                    {showShareMenu && (
                      <div className="absolute bottom-full mb-2 right-0 w-52 bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl z-50">
                        <button
                          onClick={handleShareNative}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-white"
                        >
                          <Share2 className="w-4 h-4 text-cyan-400" />
                          Share Radio
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-white"
                        >
                          {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4 text-cyan-400" />}
                          {linkCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button
                          onClick={handleShareTwitter}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-sm text-white"
                        >
                          <Twitter className="w-4 h-4 text-blue-400" />
                          Share to X
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Genre Channels — Cyberpunk Living Pills */}
          {availableGenres.length > 0 && (
            <div className="mt-4 md:mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.2em]">Frequency Channels</h3>
                {selectedGenre !== 'all' && (
                  <span className="text-[10px] text-cyan-400 ml-auto font-mono">{genreTrackCount} tracks locked</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleGenreChange('all')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 ${
                    selectedGenre === 'all'
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400/50 scale-105'
                      : 'bg-black/40 text-gray-400 border border-white/10 hover:border-red-500/40 hover:text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                  }`}
                >
                  ALL {totalTracks || ''}
                </button>
                {availableGenres.slice(0, 20).map((genre, i) => {
                  const isActive = selectedGenre === genre.key
                  // Cycle through cyberpunk colors per genre
                  const colors = [
                    { active: 'from-cyan-500 to-blue-600', border: 'border-cyan-400/50', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]', hover: 'hover:border-cyan-500/40 hover:text-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]' },
                    { active: 'from-purple-500 to-pink-600', border: 'border-purple-400/50', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]', hover: 'hover:border-purple-500/40 hover:text-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
                    { active: 'from-green-500 to-emerald-600', border: 'border-green-400/50', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.5)]', hover: 'hover:border-green-500/40 hover:text-green-400 hover:shadow-[0_0_12px_rgba(74,222,128,0.3)]' },
                    { active: 'from-orange-500 to-red-600', border: 'border-orange-400/50', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]', hover: 'hover:border-orange-500/40 hover:text-orange-400 hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]' },
                    { active: 'from-pink-500 to-rose-600', border: 'border-pink-400/50', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]', hover: 'hover:border-pink-500/40 hover:text-pink-400 hover:shadow-[0_0_12px_rgba(236,72,153,0.3)]' },
                    { active: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]', hover: 'hover:border-yellow-500/40 hover:text-yellow-400 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]' },
                    { active: 'from-teal-500 to-cyan-600', border: 'border-teal-400/50', glow: 'shadow-[0_0_20px_rgba(45,212,191,0.5)]', hover: 'hover:border-teal-500/40 hover:text-teal-400 hover:shadow-[0_0_12px_rgba(45,212,191,0.3)]' },
                  ]
                  const c = colors[i % colors.length]
                  return (
                    <button
                      key={genre.key}
                      onClick={() => handleGenreChange(genre.key)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${c.active} text-white ${c.glow} ${c.border} scale-105`
                          : `bg-black/40 text-gray-400 border border-white/10 ${c.hover}`
                      }`}
                    >
                      {genre.label} <span className={isActive ? 'text-white/70' : 'opacity-50'}>{genre.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Info Cards — glass panels over 4D universe */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 mt-4 md:mt-6">
            <div className="bg-black/20 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-3 text-center hover:border-cyan-400/40 transition-all">
              <div className="text-xl md:text-3xl font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">{totalTracks || queueLength || '...'}</div>
              <div className="text-xs text-gray-400">Tracks</div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-3 text-center hover:border-yellow-400/40 transition-all">
              <div className="text-xl md:text-3xl font-bold text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">24/7</div>
              <div className="text-xs text-gray-400">Infinite Loop</div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm border border-green-500/20 rounded-xl p-3 text-center hover:border-green-400/40 transition-all">
              <div className="text-xl md:text-3xl font-bold text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]">OGUN</div>
              <div className="text-xs text-gray-400">Streaming Rewards</div>
            </div>
          </div>

          {/* Ecosystem Badges — neon-lit status indicators */}
          <div className="mt-4 md:mt-6 flex flex-wrap items-center justify-center gap-2">
            <a href="https://www.npmjs.com/package/@soundchain/openclaw-plugin" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/30 border border-red-500/30 rounded-full text-[10px] font-bold text-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:border-red-400/60 transition-all group">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover:animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              npm
            </a>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/30 border border-orange-500/30 rounded-full text-[10px] font-bold text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
              ClawHub
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/30 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
              Polygon
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/30 border border-cyan-500/30 rounded-full text-[10px] font-bold text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              IPFS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/30 border border-green-500/30 rounded-full text-[10px] font-bold text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
              {totalTracks || 618}+ Agents
            </span>
          </div>

          {/* Footer whisper */}
          <div className="mt-4 md:mt-6 text-center">
            <p className="text-[10px] font-mono text-gray-600 tracking-widest uppercase">OGUN L2 // Decentralized Music // 2073</p>
          </div>
        </main>
      </div>

      {/* Share to Story Modal */}
      <CreateStoryModal
        isOpen={showShareStoryModal}
        onClose={() => setShowShareStoryModal(false)}
        prefillTrack={currentTrack ? {
          trackId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          artworkUrl: currentTrack.artwork_url,
        } : null}
      />

      {/* Toast container for OGUN reward notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: 'rgba(10, 22, 40, 0.95)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
        }}
      />
    </>
  )
}

// Custom layout - radio page is standalone, no default Layout wrapper
// Must include ModalProvider since useModalDispatch is used in the page
OGUNRadio.getLayout = ((page: ReactElement) => (
  <ModalProvider>{page}</ModalProvider>
)) as CustomLayout
