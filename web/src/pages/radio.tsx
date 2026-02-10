/**
 * OGUN Radio - Live NFT Music Player
 * 24/7 Infinite Shuffle - Just tune in and listen
 * Tap anywhere to start (browser requirement)
 */

import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
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
  ArrowLeft
} from 'lucide-react'
import { Logo } from 'icons/Logo'
import { useLogStream } from 'hooks/useLogStream'
import { useMagicContext } from 'hooks/useMagicContext'
import { toast, ToastContainer } from 'react-toastify'
import { OgunRewardToast, DailyLimitToast } from 'components/common/OgunRewardToast'
import 'react-toastify/dist/ReactToastify.css'

interface RadioTrack {
  id: string
  title: string
  artist: string
  album?: string
  artwork_url?: string
  stream_url?: string
  play_count: number
  is_nft: boolean
}

export default function OGUNRadio() {
  const router = useRouter()
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queueLength, setQueueLength] = useState(0)
  const [totalTracks, setTotalTracks] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [needsInteraction, setNeedsInteraction] = useState(true)

  const audioRef = useRef<HTMLAudioElement>(null)
  const streamLoggedForCurrentPlay = useRef(false)

  // Wallet address for OGUN streaming rewards
  const { account: walletAddress } = useMagicContext()

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
  const fetchCurrentTrack = async () => {
    try {
      const res = await fetch('/api/agent/radio')
      const data = await res.json()

      if (data.success && data.data?.now_playing) {
        setCurrentTrack(data.data.now_playing)
        setQueueLength(data.data.queue_length || 0)
        setTotalTracks(data.data.total_tracks || data.data.queue_length || 0)
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

  // Skip to next track
  const skipToNext = async () => {
    try {
      await fetch('/api/agent/radio', { method: 'POST' })
      await fetchCurrentTrack()
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
        logStream(currentTrack.id, playDuration, walletAddress || undefined)
          .catch(err => console.warn('[OGUN Radio] Failed to log stream:', err))
      }
    }
  }

  // Handle track end - reset stream flag and auto skip to next (infinite loop)
  const handleTrackEnd = () => {
    streamLoggedForCurrentPlay.current = false
    skipToNext()
  }

  // Format time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Head>
        <title>OGUN Radio - 24/7 NFT Music | SoundChain</title>
        <meta name="description" content="618 NFT tracks broadcasting 24/7 on OGUN Radio - infinite shuffle, zero ads, pure music" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#030d1b] via-[#0a1628] to-[#030d1b] text-white">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => skipToNext()} // Auto-skip on error
        />

        {/* Tap Anywhere Prompt - minimal, disappears on interaction */}
        {needsInteraction && !isLoading && currentTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer">
            <div className="text-center animate-pulse">
              <Radio className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-white">TAP ANYWHERE</p>
              <p className="text-gray-400 mt-2">to start OGUN Radio</p>
            </div>
          </div>
        )}

        {/* Modern DEX-style Header */}
        <nav className="backdrop-blur-xl bg-gray-900/95 border-b border-cyan-500/20 px-4 py-2 sticky top-0 z-50 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                <span className="text-xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                  SoundChain
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full border border-red-500/30">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-red-400 font-bold text-sm">OGUN RADIO</span>
                {isPlaying && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400">LIVE</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Radio Display */}
          <div className="relative bg-[#0a1628] border border-red-900/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-red-900/20">

            {/* Station Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/30 rounded-full mb-4">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-red-400 text-sm font-medium">
                  {isPlaying ? 'NOW PLAYING' : 'BROADCASTING'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">OGUN Radio</h1>
              <p className="text-gray-400 flex items-center justify-center gap-2">
                {totalTracks || queueLength || '...'} NFT Tracks <Shuffle className="w-4 h-4 text-green-400" /> Infinite Shuffle
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
                  onClick={fetchCurrentTrack}
                  className="px-6 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : currentTrack ? (
              <>
                {/* Now Playing */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                  {/* Artwork with spinning animation when playing */}
                  <div className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0">
                    <div className={`w-full h-full ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
                      {currentTrack.artwork_url ? (
                        <img
                          src={currentTrack.artwork_url}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover rounded-full shadow-lg border-4 border-gray-800"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900 to-purple-900 rounded-full flex items-center justify-center border-4 border-gray-800">
                          <Music className="w-20 h-20 text-white/50" />
                        </div>
                      )}
                    </div>
                    {/* Center hole for vinyl effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 bg-[#0a1628] rounded-full border-2 border-gray-700" />
                    </div>
                    {currentTrack.is_nft && (
                      <div className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                        NFT
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                      {currentTrack.title}
                    </h2>
                    <p className="text-xl text-gray-400 mb-4">{currentTrack.artist}</p>
                    {currentTrack.album && (
                      <p className="text-sm text-gray-500 mb-2">Album: {currentTrack.album}</p>
                    )}
                    <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {currentTrack.play_count} plays
                      </span>
                      <span>{totalTracks || queueLength} NFT Tracks</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-200"
                      style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6">
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
                <div className="flex items-center justify-center gap-3 mt-4">
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

                {/* Track Link */}
                <div className="mt-8 text-center">
                  <Link
                    href={`/dex/track/${currentTrack.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    View Track Details
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : null}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-[#0a1628] border border-cyan-900/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{totalTracks || queueLength || '...'}</div>
              <div className="text-sm text-gray-500">NFT Tracks</div>
            </div>
            <div className="bg-[#0a1628] border border-yellow-900/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">24/7</div>
              <div className="text-sm text-gray-500">Infinite Loop</div>
            </div>
            <div className="bg-[#0a1628] border border-green-900/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">OGUN</div>
              <div className="text-sm text-gray-500">Streaming Rewards</div>
            </div>
          </div>

          {/* API Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Powered by OGUN L2 - Decentralized Music Streaming</p>
            <p className="mt-1">
              Agent API: <code className="text-cyan-400">soundchain.io/api/agent/radio</code>
            </p>
          </div>
        </main>
      </div>

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
