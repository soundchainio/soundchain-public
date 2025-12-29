import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Flame, Crown, Medal, TrendingUp, Play } from 'lucide-react'
import { TrackNFTCard } from './TrackNFTCard'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'

interface TopChartsSectionProps {
  tracks: any[]
  onPlayTrack: (track: any, index: number, playlist: any[]) => void
  isPlaying: boolean
  currentTrackId?: string
  loading?: boolean
}

// Rank badges for top positions
const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return (
        <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
          <Crown className="w-4 h-4 text-white" />
        </div>
      )
    case 2:
      return (
        <div className="absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
          <Medal className="w-3.5 h-3.5 text-white" />
        </div>
      )
    case 3:
      return (
        <div className="absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
          <Medal className="w-3.5 h-3.5 text-white" />
        </div>
      )
    default:
      return (
        <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
          {rank}
        </div>
      )
  }
}

// Fire effect for trending tracks
const TrendingFire = ({ streams }: { streams: number }) => {
  if (streams < 100) return null

  const fireCount = streams > 1000 ? 3 : streams > 500 ? 2 : 1

  return (
    <div className="absolute -top-1 -right-1 z-10 flex">
      {Array.from({ length: fireCount }).map((_, i) => (
        <Flame
          key={i}
          className={`w-4 h-4 text-orange-500 animate-bounce ${i > 0 ? '-ml-1' : ''}`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

export function TopChartsSection({ tracks, onPlayTrack, isPlaying, currentTrackId, loading }: TopChartsSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30">
          <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
          <span className="retro-title">Loading Top Charts...</span>
        </div>
      </div>
    )
  }

  if (!tracks || tracks.length === 0) return null

  // Take top 10 for featured section
  const topTracks = tracks.slice(0, 10)

  return (
    <div className="mb-10">
      {/* Header with trophy and stats */}
      <div className="flex items-center justify-between mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-red-600/20 border border-yellow-500/30 relative overflow-hidden">
        {/* Animated background sparkles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-2 left-10 w-1 h-1 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute top-4 right-20 w-1 h-1 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-3 left-1/3 w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="retro-title text-xl flex items-center gap-2">
              Top Charts
              <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
            </h2>
            <p className="text-sm text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Most streamed tracks on SoundChain
            </p>
          </div>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-2 relative z-10">
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Top 10
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="rounded-full w-8 h-8 p-0 hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="rounded-full w-8 h-8 p-0 hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Horizontal Scroll Container with edge fade indicators */}
      <div className="relative">
        {/* Left fade - shows when can scroll left */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none" />
        )}

        {/* Right fade - shows when can scroll right */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {topTracks.map((track, index) => (
            <div
              key={track.id}
              className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[200px] relative group"
              style={{ scrollSnapAlign: 'start' }}
            >
            {/* Rank Badge */}
            {getRankBadge(index + 1)}

            {/* Trending Fire */}
            <TrendingFire streams={track.playbackCount || 0} />

            {/* Glow effect for top 3 */}
            {index < 3 && (
              <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                index === 0 ? 'shadow-[0_0_30px_rgba(234,179,8,0.4)]' :
                index === 1 ? 'shadow-[0_0_20px_rgba(156,163,175,0.3)]' :
                'shadow-[0_0_20px_rgba(180,83,9,0.3)]'
              }`} />
            )}

            <TrackNFTCard
              track={track}
              onPlay={() => onPlayTrack(track, index, topTracks)}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrackId === track.id}
              listView={false}
            />

            {/* Stream count badge */}
            <div className="absolute bottom-2 right-2 z-10">
              <Badge className="bg-black/70 text-cyan-400 text-xs flex items-center gap-1">
                <Play className="w-2.5 h-2.5" />
                {track.playbackCount?.toLocaleString() || 0}
              </Badge>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
