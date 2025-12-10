import React, { useState } from 'react'
import { Trophy, Crown, Medal, Award, Flame, Play, ChevronDown, ChevronUp, Star, Zap } from 'lucide-react'
import { Card, CardContent } from 'components/ui/card'
import { Badge } from 'components/ui/badge'
import { Button } from 'components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from 'components/ui/avatar'

interface GenreLeaderboardProps {
  genreData: {
    genre: string
    tracks: any[]
  }[]
  onPlayTrack: (track: any, index: number, playlist: any[]) => void
  isPlaying: boolean
  currentTrackId?: string
}

// POAP Badge designs for each position
const POAPBadge = ({ position, size = 'md' }: { position: 1 | 2 | 3; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  const configs = {
    1: {
      gradient: 'from-yellow-400 via-amber-500 to-orange-500',
      shadow: 'shadow-yellow-500/50',
      icon: Crown,
      label: 'Champion',
      glow: 'animate-pulse',
    },
    2: {
      gradient: 'from-gray-300 via-slate-400 to-gray-500',
      shadow: 'shadow-gray-400/30',
      icon: Medal,
      label: 'Runner Up',
      glow: '',
    },
    3: {
      gradient: 'from-amber-600 via-orange-700 to-amber-800',
      shadow: 'shadow-amber-600/30',
      icon: Award,
      label: 'Third Place',
      glow: '',
    },
  }

  const config = configs[position]
  const IconComponent = config.icon

  return (
    <div className={`relative ${sizeClasses[size]} ${config.glow}`}>
      {/* Outer glow ring for champion */}
      {position === 1 && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-md opacity-60 animate-pulse" />
      )}
      {/* Badge circle */}
      <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ${config.shadow}`}>
        <IconComponent className={`${size === 'lg' ? 'w-7 h-7' : size === 'md' ? 'w-5 h-5' : 'w-3 h-3'} text-white drop-shadow-md`} />
      </div>
      {/* Position number */}
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white/30 flex items-center justify-center text-[10px] font-bold text-white">
        {position}
      </div>
    </div>
  )
}

// Individual track row in leaderboard
const LeaderboardRow = ({
  track,
  rank,
  genre,
  onPlay,
  isPlaying,
  isCurrentTrack,
}: {
  track: any
  rank: number
  genre: string
  onPlay: () => void
  isPlaying: boolean
  isCurrentTrack: boolean
}) => {
  const isTopThree = rank <= 3
  const streams = track.playbackCount || 0

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 cursor-pointer group ${
        isCurrentTrack
          ? 'bg-cyan-500/20 border border-cyan-500/50'
          : isTopThree
          ? 'bg-gradient-to-r from-white/5 to-transparent hover:from-white/10'
          : 'hover:bg-white/5'
      }`}
      onClick={onPlay}
    >
      {/* Rank / POAP Badge */}
      <div className="w-12 flex-shrink-0 flex justify-center">
        {rank <= 3 ? (
          <POAPBadge position={rank as 1 | 2 | 3} size="sm" />
        ) : (
          <span className={`text-lg font-bold ${rank <= 10 ? 'text-cyan-400' : 'text-gray-500'}`}>
            #{rank}
          </span>
        )}
      </div>

      {/* Track artwork */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group">
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
        )}
        {/* Play overlay */}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
          isCurrentTrack && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <Play className={`w-5 h-5 text-white ${isCurrentTrack && isPlaying ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium truncate ${isTopThree ? 'text-white' : 'text-gray-300'}`}>
          {track.title}
        </h4>
        <p className="text-sm text-gray-500 truncate">{track.artist}</p>
      </div>

      {/* Stream count with fire effect */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {streams >= 100 && (
          <div className="flex">
            {Array.from({ length: Math.min(3, Math.floor(streams / 500) + 1) }).map((_, i) => (
              <Flame
                key={i}
                className={`w-4 h-4 text-orange-500 ${i > 0 ? '-ml-1' : ''}`}
              />
            ))}
          </div>
        )}
        <Badge className="bg-black/50 text-cyan-400 text-xs">
          <Play className="w-3 h-3 mr-1" />
          {streams.toLocaleString()}
        </Badge>
      </div>
    </div>
  )
}

// Genre card with expandable leaderboard
const GenreLeaderboardCard = ({
  genre,
  tracks,
  onPlayTrack,
  isPlaying,
  currentTrackId,
  initiallyExpanded = false,
}: {
  genre: string
  tracks: any[]
  onPlayTrack: (track: any, index: number, playlist: any[]) => void
  isPlaying: boolean
  currentTrackId?: string
  initiallyExpanded?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded)

  // Sort tracks by playback count for rankings
  const rankedTracks = [...tracks].sort((a, b) => (b.playbackCount || 0) - (a.playbackCount || 0))
  const topThree = rankedTracks.slice(0, 3)
  const remaining = rankedTracks.slice(3, 10)

  // Genre display names
  const genreDisplayNames: Record<string, string> = {
    hip_hop: 'Hip Hop', electronic: 'Electronic', pop: 'Pop', r_and_b: 'R&B',
    jazz: 'Jazz', rock: 'Rock', classical: 'Classical', reggae: 'Reggae',
    latin: 'Latin', country: 'Country', house: 'House', techno: 'Techno',
    indie: 'Indie', metal: 'Metal', blues: 'Blues', ambient: 'Ambient',
    lo_fi: 'Lo-Fi', soul_funk: 'Soul & Funk', k_pop: 'K-Pop', alternative: 'Alternative',
  }

  const displayName = genreDisplayNames[genre] || genre.charAt(0).toUpperCase() + genre.slice(1).replace(/_/g, ' ')

  // Genre gradient colors
  const genreGradients: Record<string, string> = {
    hip_hop: 'from-orange-600 to-red-600',
    electronic: 'from-cyan-500 to-blue-600',
    pop: 'from-pink-500 to-purple-600',
    r_and_b: 'from-purple-600 to-indigo-600',
    jazz: 'from-amber-500 to-yellow-600',
    house: 'from-blue-500 to-cyan-500',
    techno: 'from-gray-600 to-slate-700',
  }

  const gradientClass = genreGradients[genre] || 'from-cyan-500 to-purple-600'

  if (tracks.length === 0) return null

  return (
    <Card className="retro-card overflow-hidden">
      {/* Header with top 3 preview */}
      <div
        className={`p-4 cursor-pointer bg-gradient-to-r ${gradientClass} bg-opacity-20`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="retro-title text-lg flex items-center gap-2">
                {displayName}
                <Badge className="bg-white/10 text-white text-xs">{tracks.length} tracks</Badge>
              </h3>
              <p className="text-xs text-white/70">Top performers in this genre</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mini top 3 avatars */}
            <div className="hidden sm:flex items-center -space-x-2">
              {topThree.map((track, i) => (
                <div key={track.id} className="relative">
                  <Avatar className={`w-8 h-8 border-2 ${i === 0 ? 'border-yellow-400' : i === 1 ? 'border-gray-400' : 'border-amber-600'}`}>
                    <AvatarImage src={track.artworkUrl} alt={track.title} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-purple-600 text-xs">
                      {i + 1}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Top 3 Podium Preview (always visible) */}
        <div className="mt-4 flex items-end justify-center gap-2 sm:gap-4">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="flex flex-col items-center">
              <POAPBadge position={2} size="md" />
              <div className="mt-2 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-gray-400/50">
                {topThree[1].artworkUrl ? (
                  <img src={topThree[1].artworkUrl} alt={topThree[1].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                    <Medal className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-white/70 truncate max-w-16 sm:max-w-20 text-center">{topThree[1].title}</p>
            </div>
          )}

          {/* 1st Place - Elevated */}
          {topThree[0] && (
            <div className="flex flex-col items-center -mt-4">
              <POAPBadge position={1} size="lg" />
              <div className="mt-2 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-yellow-400 shadow-lg shadow-yellow-500/30">
                {topThree[0].artworkUrl ? (
                  <img src={topThree[0].artworkUrl} alt={topThree[0].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-white font-medium truncate max-w-20 sm:max-w-24 text-center">{topThree[0].title}</p>
              <Badge className="mt-1 bg-yellow-500/20 text-yellow-400 text-xs">
                <Play className="w-3 h-3 mr-1" />
                {(topThree[0].playbackCount || 0).toLocaleString()}
              </Badge>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="flex flex-col items-center">
              <POAPBadge position={3} size="md" />
              <div className="mt-2 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-amber-600/50">
                {topThree[2].artworkUrl ? (
                  <img src={topThree[2].artworkUrl} alt={topThree[2].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-400" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-white/70 truncate max-w-16 sm:max-w-20 text-center">{topThree[2].title}</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded leaderboard */}
      {isExpanded && (
        <CardContent className="p-4 border-t border-white/10">
          <div className="space-y-1">
            {/* Top 3 detailed rows */}
            {topThree.map((track, index) => (
              <LeaderboardRow
                key={track.id}
                track={track}
                rank={index + 1}
                genre={genre}
                onPlay={() => onPlayTrack(track, index, rankedTracks)}
                isPlaying={isPlaying}
                isCurrentTrack={currentTrackId === track.id}
              />
            ))}

            {/* Separator */}
            {remaining.length > 0 && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500">Contenders</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            {/* Remaining tracks */}
            {remaining.map((track, index) => (
              <LeaderboardRow
                key={track.id}
                track={track}
                rank={index + 4}
                genre={genre}
                onPlay={() => onPlayTrack(track, index + 3, rankedTracks)}
                isPlaying={isPlaying}
                isCurrentTrack={currentTrackId === track.id}
              />
            ))}
          </div>

          {/* Future: Playoff bracket teaser */}
          {tracks.length >= 8 && (
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-purple-400">Playoff Bracket Coming Soon</p>
                  <p className="text-xs text-gray-400">Top 8 will compete for OGUN token rewards!</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function GenreLeaderboard({ genreData, onPlayTrack, isPlaying, currentTrackId }: GenreLeaderboardProps) {
  // Sort genres by total streams to show most active first
  const sortedGenres = [...genreData].sort((a, b) => {
    const aStreams = a.tracks.reduce((sum, t) => sum + (t.playbackCount || 0), 0)
    const bStreams = b.tracks.reduce((sum, t) => sum + (t.playbackCount || 0), 0)
    return bStreams - aStreams
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-cyan-600/20 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="retro-title text-xl flex items-center gap-2">
              Genre Leaderboards
              <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
            </h2>
            <p className="text-sm text-gray-400">
              Top 3 in each genre earn exclusive POAP badges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Crown className="w-3 h-3 mr-1" />
            Gold POAP
          </Badge>
          <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30">
            <Medal className="w-3 h-3 mr-1" />
            Silver
          </Badge>
          <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
            <Award className="w-3 h-3 mr-1" />
            Bronze
          </Badge>
        </div>
      </div>

      {/* Genre Leaderboard Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedGenres.map((data, index) => (
          <GenreLeaderboardCard
            key={data.genre}
            genre={data.genre}
            tracks={data.tracks}
            onPlayTrack={onPlayTrack}
            isPlaying={isPlaying}
            currentTrackId={currentTrackId}
            initiallyExpanded={index === 0}
          />
        ))}
      </div>
    </div>
  )
}
