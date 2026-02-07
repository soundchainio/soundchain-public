/**
 * OGUN Radio - Live NFT Music Player
 * Listen to 618 NFT tracks broadcasting 24/7
 */

import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Music,
  ExternalLink,
  Disc3
} from 'lucide-react'
import { Logo } from 'icons/Logo'

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
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queueLength, setQueueLength] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)

  // Fetch current track from OGUN Radio
  const fetchCurrentTrack = async () => {
    try {
      const res = await fetch('/api/agent/radio')
      const data = await res.json()

      if (data.success && data.data?.now_playing) {
        setCurrentTrack(data.data.now_playing)
        setQueueLength(data.data.queue_length || 0)
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
    setIsLoading(true)
    setIsPlaying(false)

    try {
      // POST to advance the playlist
      await fetch('/api/agent/radio', { method: 'POST' })
      // Then fetch the new current track
      await fetchCurrentTrack()
    } catch (e) {
      setError('Failed to skip track')
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchCurrentTrack()
  }, [])

  // Update audio source when track changes
  useEffect(() => {
    if (currentTrack?.stream_url && audioRef.current) {
      audioRef.current.src = currentTrack.stream_url
      audioRef.current.load()
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false))
      }
    }
  }, [currentTrack])

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
    setIsPlaying(!isPlaying)
  }

  // Handle volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Update progress
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)
    }
  }

  // Handle track end - auto skip to next
  const handleTrackEnd = () => {
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
        <title>OGUN Radio - Live NFT Music | SoundChain</title>
        <meta name="description" content="Listen to 618 NFT tracks broadcasting 24/7 on OGUN Radio - the decentralized music station" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#030d1b] via-[#0a1628] to-[#030d1b] text-white">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setError('Audio failed to load')}
        />

        {/* Header */}
        <header className="border-b border-red-900/30 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/dex" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="text-white font-bold hidden sm:block">SoundChain</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="text-red-400 font-bold">OGUN RADIO</span>
              </div>
              <span className="text-xs text-gray-500">LIVE</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Radio Display */}
          <div className="bg-[#0a1628] border border-red-900/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-red-900/20">

            {/* Station Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/30 rounded-full mb-4">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">BROADCASTING LIVE</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">OGUN Radio</h1>
              <p className="text-gray-400">618 NFT Tracks • 24/7 Decentralized Music</p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Disc3 className="w-16 h-16 text-red-500 animate-spin" style={{ animationDuration: '3s' }} />
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
                  {/* Artwork */}
                  <div className="relative w-48 h-48 md:w-64 md:h-64 flex-shrink-0">
                    {currentTrack.artwork_url ? (
                      <img
                        src={currentTrack.artwork_url}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover rounded-xl shadow-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-900 to-purple-900 rounded-xl flex items-center justify-center">
                        <Music className="w-20 h-20 text-white/50" />
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 rounded-xl border-2 border-red-500 animate-pulse" />
                    )}
                    {currentTrack.is_nft && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
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
                      <span>Queue: {queueLength} tracks</span>
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
              <div className="text-3xl font-bold text-cyan-400">618</div>
              <div className="text-sm text-gray-500">NFT Tracks</div>
            </div>
            <div className="bg-[#0a1628] border border-yellow-900/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">24/7</div>
              <div className="text-sm text-gray-500">Live Broadcasting</div>
            </div>
            <div className="bg-[#0a1628] border border-green-900/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">OGUN</div>
              <div className="text-sm text-gray-500">Streaming Rewards</div>
            </div>
          </div>

          {/* API Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Powered by OGUN L2 • Decentralized Music Streaming</p>
            <p className="mt-1">
              Agent API: <code className="text-cyan-400">soundchain.io/api/agent/radio</code>
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
