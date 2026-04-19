'use client'

import Link from 'next/link'
import { useMe } from 'hooks/useMe'
import { useMagicContext } from 'hooks/useMagicContext'
import { Avatar } from '../Avatar'
import { useFollowingQuery, useFavoriteTracksQuery, useTracksQuery, SortTrackField, SortOrder } from 'lib/graphql'
import {
  Music, Heart, Users, Wallet, Settings, Disc3, Rss, MessageSquare,
  ListMusic, ShoppingBag, Zap, Radio, TrendingUp
} from 'lucide-react'

export const MiniProfileDashboard = () => {
  const me = useMe()
  const profile = me?.profile
  const { balance: polBalance, ogunBalance } = useMagicContext()

  // Get following count for stats
  const { data: followingData } = useFollowingQuery({
    variables: { profileId: profile?.id || '', page: { first: 1 } },
    skip: !profile?.id,
  })

  // Get user's recent tracks
  const { data: tracksData } = useTracksQuery({
    variables: {
      filter: { profileId: profile?.id },
      page: { first: 4 },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
    },
    skip: !profile?.id,
  })

  // Get user's favorite tracks
  const { data: favoritesData } = useFavoriteTracksQuery({
    variables: { page: { first: 4 } },
    skip: !me,
  })

  const recentTracks = tracksData?.tracks?.nodes || []
  const favoriteTracks = favoritesData?.favoriteTracks?.nodes || []
  const followingCount = followingData?.following?.pageInfo?.totalCount || profile?.followingCount || 0
  const followerCount = profile?.followerCount || 0

  if (!me || !profile) {
    // Guest: show compact welcome + sign in
    return (
      <div className="w-[280px] flex-shrink-0 hidden xl:block">
        <div className="sticky top-4 space-y-4">
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-5 border border-cyan-500/20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Welcome to SoundChain</h3>
              <p className="text-gray-400 text-sm mb-4">Stream. Earn. Own.</p>
              <Link
                href="/login"
                className="block w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[280px] flex-shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl overflow-hidden border border-cyan-500/20">
          {/* Cover gradient */}
          <div className="h-16 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30" />

          {/* Avatar + Name */}
          <div className="px-4 pb-4 -mt-8">
            <Link href={`/dex/users/${profile.userHandle}`} className="block group">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-neutral-900 mb-2">
                <Avatar profile={profile} pixels={64} />
              </div>
              <h3 className="text-white font-bold text-sm group-hover:text-cyan-400 transition-colors truncate">
                {profile.displayName || profile.userHandle}
              </h3>
              <p className="text-gray-500 text-xs truncate">@{profile.userHandle}</p>
            </Link>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3">
              <Link href={`/dex/users/${profile.userHandle}`} className="group">
                <span className="text-white font-bold text-sm">{followerCount.toLocaleString()}</span>
                <span className="text-gray-500 text-xs ml-1 group-hover:text-cyan-400 transition-colors">Followers</span>
              </Link>
              <Link href={`/dex/users/${profile.userHandle}`} className="group">
                <span className="text-white font-bold text-sm">{followingCount.toLocaleString()}</span>
                <span className="text-gray-500 text-xs ml-1 group-hover:text-cyan-400 transition-colors">Following</span>
              </Link>
            </div>

            {/* Wallet Quick Glance */}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300 font-medium">{parseFloat(ogunBalance || '0').toFixed(1)} OGUN</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <TrendingUp className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-300 font-medium">{parseFloat(polBalance || '0').toFixed(2)} POL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-neutral-900/80 rounded-2xl p-2 border border-neutral-800">
          <div className="space-y-0.5">
            <Link
              href="/nodes"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
            >
              <Rss className="w-4 h-4" />
              <span className="text-sm font-medium">Feed</span>
            </Link>
            <Link
              href={`/dex/users/${profile.userHandle}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">My Wall</span>
            </Link>
            <Link
              href="/explore"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
            >
              <Radio className="w-4 h-4" />
              <span className="text-sm font-medium">Explore</span>
            </Link>
            <Link
              href="/users"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Users</span>
            </Link>
            {/* Marketplace ghosted — storefronts on profiles (Shop tab) */}
            <Link
              href="/wallet"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Wallet</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </div>
        </div>

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div className="bg-neutral-900/80 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Your Tracks</h4>
              <Link href={`/dex/users/${profile.userHandle}`} className="text-cyan-400 text-xs hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {recentTracks.slice(0, 4).map((track) => (
                <Link
                  key={track.id}
                  href={`/dex/track/${track.id}`}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative group"
                >
                  <img
                    src={track.artworkUrl ?? '/images/default-artwork.png'}
                    alt={track.title ?? 'Track'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Disc3 className="w-5 h-5 text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Tracks */}
        {favoriteTracks.length > 0 && (
          <div className="bg-neutral-900/80 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                Favorites
              </h4>
              <Link href="/library" className="text-cyan-400 text-xs hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {favoriteTracks.slice(0, 4).map((track) => (
                <Link
                  key={track.id}
                  href={`/dex/track/${track.id}`}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative group"
                >
                  <img
                    src={track.artworkUrl ?? '/images/default-artwork.png'}
                    alt={track.title ?? 'Track'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Playlists Preview */}
        <div className="bg-neutral-900/80 rounded-2xl p-3 border border-neutral-800">
          <Link
            href="/playlist"
            className="flex items-center gap-3 px-2 py-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
          >
            <ListMusic className="w-4 h-4" />
            <span className="text-sm font-medium">My Playlists</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
