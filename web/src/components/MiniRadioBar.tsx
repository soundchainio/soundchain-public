/**
 * MiniRadioBar — Persistent mini player for OGUN Radio
 * Shows on non-radio pages when radio is actively playing.
 * Clicking it navigates back to the full radio page.
 */

import { useRadioOptional } from 'contexts/RadioContext'
import { Play, Pause, SkipForward, Radio } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export function MiniRadioBar() {
  const radio = useRadioOptional()
  const router = useRouter()

  // Don't show on the radio page itself, or if radio isn't playing
  if (!radio || !radio.currentTrack || !radio.isPlaying) return null
  if (router.pathname === '/radio' || router.pathname === '/ogun/radio') return null

  const { currentTrack, togglePlay, skipToNext, isPlaying } = radio

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-900/95 via-black/95 to-red-900/95 backdrop-blur-xl border-b border-red-500/30 shadow-lg shadow-red-900/20">
      <div className="max-w-screen-xl mx-auto flex items-center gap-3 px-3 py-1.5">
        {/* Radio icon + link */}
        <Link href="/radio" className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center flex-shrink-0">
            {currentTrack.artwork_url ? (
              <img src={currentTrack.artwork_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <Radio className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{currentTrack.title}</div>
            <div className="text-[10px] text-gray-400 truncate">{currentTrack.artist}</div>
          </div>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-red-400 font-mono mr-1 hidden sm:inline">OGUN RADIO</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay() }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600/50 hover:bg-red-600/70 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); skipToNext() }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )
}
