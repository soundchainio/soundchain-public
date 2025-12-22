'use client'

import Link from 'next/link'
import { useTracksQuery, useExploreUsersQuery, SortTrackField, SortOrder, SortUserField } from 'lib/graphql'
import { Avatar } from '../Avatar'
import { TrendingUp, Flame, Play, Users, BadgeCheck, Sparkles } from 'lucide-react'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'

export const RightSidebar = () => {
  const { playlistState } = useAudioPlayerContext()

  // Get trending tracks (most played)
  const { data: trendingData } = useTracksQuery({
    variables: {
      page: { first: 5 },
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
    },
  })

  // Get featured/top users
  const { data: usersData } = useExploreUsersQuery({
    variables: {
      filter: {},
      page: { first: 5 },
      sort: { field: SortUserField.FollowerCount, order: SortOrder.Desc },
    },
  })

  const trendingTracks = trendingData?.tracks?.nodes || []
  const featuredUsers = usersData?.exploreUsers?.nodes || []

  const handlePlayTrack = (track: any) => {
    const song: Song = {
      trackId: track.id,
      src: track.playbackUrl,
      art: track.artworkUrl,
      title: track.title,
      artist: track.artist,
      isFavorite: track.isFavorite,
    }
    playlistState([song], 0)
  }

  return (
    <div className="w-[280px] flex-shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-4">
        {/* Trending Tracks */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-4 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Trending Now</h3>
              <p className="text-gray-500 text-xs">Hot tracks this week</p>
            </div>
          </div>

          <div className="space-y-2">
            {trendingTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                onClick={() => handlePlayTrack(track)}
              >
                {/* Rank */}
                <span className={`w-5 text-center font-bold text-sm ${
                  index === 0 ? 'text-orange-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-amber-600' :
                  'text-gray-500'
                }`}>
                  {index + 1}
                </span>

                {/* Artwork */}
                <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0">
                  <img
                    src={track.artworkUrl || '/images/default-artwork.png'}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-4 h-4 text-white" fill="white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{track.artist}</p>
                </div>

                {/* Play count */}
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {track.playbackCountFormatted || '0'}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dex/explore"
            className="block w-full mt-3 py-2 text-center text-cyan-400 text-sm hover:bg-cyan-500/10 rounded-lg transition-colors"
          >
            See all trending
          </Link>
        </div>

        {/* Featured Artists */}
        <div className="bg-neutral-900/80 rounded-2xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Featured Artists</h3>
              <p className="text-gray-500 text-xs">Creators to follow</p>
            </div>
          </div>

          <div className="space-y-3">
            {featuredUsers.map((user) => (
              <Link
                key={user.id}
                href={`/dex/users/${user.userHandle}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/30">
                  <Avatar profile={user} pixels={40} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-white text-sm font-medium truncate">
                      {user.displayName || user.userHandle}
                    </p>
                    {user.verified && (
                      <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">@{user.userHandle}</p>
                </div>

                {/* Follower count */}
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {user.followerCount || 0}
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/dex/explore"
            className="block w-full mt-3 py-2 text-center text-purple-400 text-sm hover:bg-purple-500/10 rounded-lg transition-colors"
          >
            Discover more
          </Link>
        </div>

        {/* Footer Links */}
        <div className="px-4 py-3 text-center">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
            <Link href="/terms" className="hover:text-gray-400">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
            <Link href="/dex/feedback" className="hover:text-gray-400">Feedback</Link>
          </div>
          <p className="text-gray-700 text-xs mt-2">© 2024 SoundChain</p>
        </div>
      </div>
    </div>
  )
}
