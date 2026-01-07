'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTracksQuery, useExploreUsersQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { Avatar } from '../Avatar'
import { TrendingUp, Flame, Play, Users, BadgeCheck, Sparkles, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { useAudioPlayerContext, Song } from 'hooks/useAudioPlayer'

export const RightSidebar = () => {
  const { playlistState } = useAudioPlayerContext()
  const [top100Expanded, setTop100Expanded] = useState(false)

  // Get trending tracks (most played)
  const { data: trendingData } = useTracksQuery({
    variables: {
      page: { first: 5 },
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
    },
  })

  // Get Top 100 NFT tracks (all tracks sorted by playback count, filter for NFTs client-side)
  const { data: top100Data, loading: top100Loading } = useTracksQuery({
    variables: {
      page: { first: 200 }, // Fetch more to ensure we get 100 NFTs after filtering
      sort: { field: SortTrackField.PlaybackCount, order: SortOrder.Desc },
    },
  })

  // Get featured/top users - no sort field available, just get recent
  const { data: usersData } = useExploreUsersQuery({
    variables: {
      page: { first: 5 },
    },
  })

  const trendingTracks = trendingData?.tracks?.nodes || []
  const featuredUsers = usersData?.exploreUsers?.nodes || []

  // Filter for NFT tracks only and limit to 100
  const top100NftTracks = (top100Data?.tracks?.nodes || [])
    .filter((track: any) => track.nftData?.tokenId || track.nftData?.contract)
    .slice(0, 100)

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
                    src={track.artworkUrl ?? '/images/default-artwork.png'}
                    alt={track.title ?? 'Track'}
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

        {/* Top 100 NFTs Accordion */}
        <div className="bg-gradient-to-br from-neutral-900 via-yellow-900/10 to-neutral-900 rounded-2xl border border-yellow-500/20 overflow-hidden">
          {/* Header - Always visible */}
          <button
            onClick={() => setTop100Expanded(!top100Expanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-yellow-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-sm">Top 100 NFTs</h3>
                <p className="text-gray-500 text-xs">Most streamed NFT tracks</p>
              </div>
            </div>
            {top100Expanded ? (
              <ChevronUp className="w-5 h-5 text-yellow-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Expandable Content */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${top100Expanded ? 'max-h-[600px]' : 'max-h-0'}`}>
            <div className="px-4 pb-4 space-y-1 overflow-y-auto max-h-[560px] scrollbar-thin scrollbar-thumb-yellow-500/20 scrollbar-track-transparent">
              {top100Loading ? (
                <div className="py-4 text-center text-gray-500 text-sm">Loading...</div>
              ) : top100NftTracks.length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">No NFT tracks found</div>
              ) : (
                top100NftTracks.map((track: any, index: number) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                    onClick={() => handlePlayTrack(track)}
                  >
                    {/* Rank */}
                    <span className={`w-6 text-center font-bold text-xs ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>
                      #{index + 1}
                    </span>

                    {/* Artwork */}
                    <div className="w-8 h-8 rounded overflow-hidden relative flex-shrink-0">
                      <img
                        src={track.artworkUrl ?? '/images/default-artwork.png'}
                        alt={track.title ?? 'Track'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-3 h-3 text-white" fill="white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate group-hover:text-yellow-400 transition-colors">
                        {track.title}
                      </p>
                      <p className="text-gray-500 text-[10px] truncate">{track.artist}</p>
                    </div>

                    {/* Play count */}
                    <span className="text-gray-500 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {track.playbackCountFormatted || '0'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preview when collapsed - show first 3 tracks */}
          {!top100Expanded && top100NftTracks.length > 0 && (
            <div className="px-4 pb-4 space-y-1">
              {top100NftTracks.slice(0, 3).map((track: any, index: number) => (
                <div
                  key={track.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                  onClick={() => handlePlayTrack(track)}
                >
                  <span className={`w-6 text-center font-bold text-xs ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    'text-amber-600'
                  }`}>
                    #{index + 1}
                  </span>
                  <div className="w-8 h-8 rounded overflow-hidden relative flex-shrink-0">
                    <img
                      src={track.artworkUrl ?? '/images/default-artwork.png'}
                      alt={track.title ?? 'Track'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-3 h-3 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate group-hover:text-yellow-400 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-gray-500 text-[10px] truncate">{track.artist}</p>
                  </div>
                  <span className="text-gray-500 text-[10px] flex items-center gap-0.5 flex-shrink-0">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {track.playbackCountFormatted || '0'}
                  </span>
                </div>
              ))}
              <button
                onClick={() => setTop100Expanded(true)}
                className="w-full mt-2 py-2 text-center text-yellow-400 text-xs hover:bg-yellow-500/10 rounded-lg transition-colors"
              >
                View all {top100NftTracks.length} NFTs
              </button>
            </div>
          )}
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
