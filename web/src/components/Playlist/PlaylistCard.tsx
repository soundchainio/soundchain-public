'use client'

import { useState } from 'react'
import { Play, Heart, Users, Music } from 'lucide-react'
import { GetUserPlaylistsQuery } from 'lib/graphql'

type PlaylistType = GetUserPlaylistsQuery['getUserPlaylists']['nodes'][0]

interface PlaylistCardProps {
  playlist: PlaylistType
  onSelect?: (playlist: PlaylistType) => void
  compact?: boolean
}

export const PlaylistCard = ({ playlist, onSelect, compact = false }: PlaylistCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const trackCount = playlist.tracks?.nodes?.length || 0

  // Placeholder for play functionality - would need to fetch full track data
  const handlePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Implement play all - needs to fetch full track data by trackIds
    console.log('Play all tracks in playlist:', playlist.id)
  }

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors cursor-pointer"
        onClick={() => onSelect?.(playlist)}
      >
        {/* Artwork */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
          {playlist.artworkUrl ? (
            <img src={playlist.artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20">
              <Music className="w-5 h-5 text-neutral-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{playlist.title}</p>
          <p className="text-gray-500 text-xs">{trackCount} tracks</p>
        </div>

        <button
          onClick={handlePlayAll}
          className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center hover:bg-cyan-400 transition-colors"
        >
          <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="group relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      style={{
        boxShadow: isHovered ? '0 20px 60px -15px rgba(236, 72, 153, 0.3)' : '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(playlist)}
    >
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-pink-500/50 via-purple-500/30 to-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Main content */}
      <div className="relative bg-neutral-900 rounded-2xl overflow-hidden">
        {/* Artwork */}
        <div className="aspect-square relative">
          {playlist.artworkUrl ? (
            <img src={playlist.artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Music className="w-16 h-16 text-neutral-600" />
            </div>
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <button
              onClick={handlePlayAll}
              className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-lg shadow-pink-500/50"
            >
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </button>
          </div>

          {/* Track count badge */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur rounded-full text-white text-xs font-medium">
            {trackCount} tracks
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-white font-bold text-lg truncate group-hover:text-pink-400 transition-colors">
            {playlist.title}
          </h3>
          {playlist.description && (
            <p className="text-gray-400 text-sm line-clamp-2 mt-1">{playlist.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <Heart className="w-4 h-4" />
              {playlist.favoriteCount}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Users className="w-4 h-4" />
              {playlist.followCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
