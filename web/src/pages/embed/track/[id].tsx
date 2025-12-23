'use client'

import { GetServerSideProps } from 'next'
import { ParsedUrlQuery } from 'querystring'
import Head from 'next/head'
import { config } from 'config'
import { createApolloClient } from 'lib/apollo'
import { TrackDocument, TrackQuery } from 'lib/graphql'
import { useState, useEffect, useRef } from 'react'
import Hls from 'hls.js'

/**
 * Embeddable Track Player
 *
 * This page is designed to be embedded in iframes by social platforms.
 * It provides a lightweight, auto-playing audio experience for SoundChain tracks.
 *
 * Used by:
 * - Twitter Player Cards
 * - Facebook Video Embeds
 * - oEmbed consumers
 * - Direct iframe embeds
 */

interface EmbedTrackPageProps {
  track: TrackQuery['track'] | null
  trackId: string
}

interface EmbedTrackPageParams extends ParsedUrlQuery {
  id: string
}

export const getServerSideProps: GetServerSideProps<EmbedTrackPageProps, EmbedTrackPageParams> = async context => {
  const trackId = context.params?.id

  if (!trackId) {
    return { notFound: true }
  }

  try {
    const apolloClient = createApolloClient(context)
    const { data } = await apolloClient.query({
      query: TrackDocument,
      variables: { id: trackId },
    })

    return {
      props: {
        track: data?.track || null,
        trackId,
      },
    }
  } catch (e) {
    console.error('Error fetching track for embed:', e)
    return {
      props: {
        track: null,
        trackId,
      },
    }
  }
}

export default function EmbedTrackPage({ track, trackId }: EmbedTrackPageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const thumbnail = track?.artworkUrl || `${config.domainUrl}/soundchain-meta-logo.png`
  const title = track?.title || 'SoundChain Track'
  const artist = track?.artist || ''

  // Setup HLS and audio source
  useEffect(() => {
    if (!audioRef.current || !track?.playbackUrl) return

    const audio = audioRef.current

    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      audio.src = track.playbackUrl
    } else if (Hls.isSupported()) {
      // Use hls.js for other browsers
      hlsRef.current = new Hls()
      hlsRef.current.loadSource(track.playbackUrl)
      hlsRef.current.attachMedia(audio)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [track?.playbackUrl])

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(() => {})
      }
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleDurationChange = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = percent * duration
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Handle click to open SoundChain
  const handleOpenSoundChain = () => {
    window.open(`${config.domainUrl}/dex/track/${trackId}`, '_blank')
  }

  return (
    <>
      <Head>
        <title>{title} | SoundChain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}</style>
      </Head>

      <div className="w-full h-screen bg-black relative overflow-hidden">
        {track?.playbackUrl ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
          >
            {/* Album Art with Play Button */}
            <div className="relative mb-6">
              <img
                src={thumbnail}
                alt={title}
                className="w-48 h-48 rounded-xl shadow-2xl object-cover"
              />
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl hover:bg-black/40 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {/* Track Info */}
            <h1 className="text-white font-bold text-xl text-center mb-1">{title}</h1>
            <p className="text-gray-400 text-sm mb-4">{artist}</p>

            {/* Progress Bar */}
            <div className="w-full max-w-sm mb-2">
              <div
                className="h-2 bg-white/20 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              className="hidden"
              playsInline
              preload="auto"
            />

            {/* SoundChain Branding */}
            <button
              onClick={handleOpenSoundChain}
              className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <img src={`${config.domainUrl}/soundchain-logo.png`} alt="SoundChain" className="w-5 h-5" />
              <span className="text-white text-sm">Open in SoundChain</span>
            </button>
          </div>
        ) : (
          /* No Playback URL - Show Preview */
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
            onClick={handleOpenSoundChain}
          >
            <img
              src={thumbnail}
              alt={title}
              className="w-48 h-48 rounded-xl shadow-2xl object-cover mb-6"
            />
            <h1 className="text-white font-bold text-xl text-center mb-1">{title}</h1>
            <p className="text-gray-400 text-sm mb-4">{artist}</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 rounded-full hover:bg-cyan-400 transition-colors">
              <span className="text-black font-semibold text-sm">Listen on SoundChain</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
