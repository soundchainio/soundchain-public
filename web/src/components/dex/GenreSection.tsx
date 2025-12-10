import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Music } from 'lucide-react'
import { TrackNFTCard } from './TrackNFTCard'
import { Button } from 'components/ui/button'

// Map genre keys to display names
const genreDisplayNames: Record<string, string> = {
  acoustic: 'Acoustic',
  alternative: 'Alternative',
  ambient: 'Ambient',
  americana: 'Americana',
  blues: 'Blues',
  c_pop: 'C-Pop',
  cannabis: 'Cannabis',
  christian: 'Christian',
  classic_rock: 'Classic Rock',
  classical: 'Classical',
  country: 'Country',
  dance: 'Dance',
  devotional: 'Devotional',
  electronic: 'Electronic',
  experimental: 'Experimental',
  gospel: 'Gospel',
  hard_rock: 'Hard Rock',
  hip_hop: 'Hip Hop',
  house: 'House',
  indie: 'Indie',
  instrumental: 'Instrumental',
  jazz: 'Jazz',
  k_pop: 'K-Pop',
  kids_and_family: 'Kids & Family',
  latin: 'Latin',
  lo_fi: 'Lo-Fi',
  metal: 'Metal',
  musica_mexicana: 'Musica Mexicana',
  musica_tropical: 'Musica Tropical',
  podcasts: 'Podcasts',
  pop: 'Pop',
  pop_latino: 'Pop Latino',
  punk: 'Punk',
  r_and_b: 'R&B',
  reggae: 'Reggae',
  reggaeton: 'Reggaeton',
  salsa: 'Salsa',
  samples: 'Samples',
  soul_funk: 'Soul & Funk',
  soundbath: 'Soundbath',
  soundtrack: 'Soundtrack',
  spoken: 'Spoken Word',
  urban_latino: 'Urban Latino',
  world: 'World',
  techno: 'Techno',
  bpm: 'BPM',
  deep_house: 'Deep House',
  jungle: 'Jungle',
}

// Genre colors for visual variety
const genreColors: Record<string, string> = {
  hip_hop: 'from-orange-600/20 to-red-600/20 border-orange-500/30',
  electronic: 'from-cyan-600/20 to-blue-600/20 border-cyan-500/30',
  pop: 'from-pink-600/20 to-purple-600/20 border-pink-500/30',
  r_and_b: 'from-purple-600/20 to-indigo-600/20 border-purple-500/30',
  jazz: 'from-amber-600/20 to-yellow-600/20 border-amber-500/30',
  rock: 'from-red-600/20 to-orange-600/20 border-red-500/30',
  classical: 'from-slate-600/20 to-gray-600/20 border-slate-500/30',
  reggae: 'from-green-600/20 to-yellow-600/20 border-green-500/30',
  latin: 'from-red-600/20 to-orange-600/20 border-red-500/30',
  country: 'from-amber-600/20 to-orange-600/20 border-amber-500/30',
  house: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30',
  techno: 'from-gray-600/20 to-slate-600/20 border-gray-500/30',
  indie: 'from-teal-600/20 to-emerald-600/20 border-teal-500/30',
  metal: 'from-gray-800/20 to-black/20 border-gray-700/30',
  blues: 'from-blue-700/20 to-indigo-700/20 border-blue-600/30',
}

interface GenreSectionProps {
  genre: string
  tracks: any[]
  onPlayTrack: (track: any, index: number, playlist: any[]) => void
  isPlaying: boolean
  currentTrackId?: string
}

export function GenreSection({ genre, tracks, onPlayTrack, isPlaying, currentTrackId }: GenreSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const displayName = genreDisplayNames[genre] || genre.charAt(0).toUpperCase() + genre.slice(1).replace(/_/g, ' ')
  const colorClass = genreColors[genre] || 'from-cyan-600/20 to-purple-600/20 border-cyan-500/30'

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300 // pixels to scroll
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  if (tracks.length === 0) return null

  return (
    <div className="mb-8">
      {/* Genre Header */}
      <div className={`flex items-center justify-between mb-4 p-3 rounded-lg bg-gradient-to-r ${colorClass} border`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="retro-title text-lg">{displayName}</h2>
            <p className="text-xs text-gray-400">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-2">
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

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex-shrink-0 w-[160px] sm:w-[180px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <TrackNFTCard
              track={track}
              onPlay={() => onPlayTrack(track, index, tracks)}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrackId === track.id}
              listView={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
