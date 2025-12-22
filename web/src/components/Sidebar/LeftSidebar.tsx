'use client'

import Link from 'next/link'
import { useMe } from 'hooks/useMe'
import { useFavoriteTracksQuery, useTracksQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { Avatar } from '../Avatar'
import { Music, Users, Heart, Disc3, Settings, Wallet } from 'lucide-react'

export const LeftSidebar = () => {
  const me = useMe()
  const profile = me?.profile

  // Get user's recent tracks (if they're an artist)
  const { data: tracksData } = useTracksQuery({
    variables: {
      filter: { profileId: profile?.id },
      page: { first: 6 },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
    },
    skip: !profile?.id,
  })

  // Get user's favorite tracks
  const { data: favoritesData } = useFavoriteTracksQuery({
    variables: { page: { first: 6 } },
    skip: !me,
  })

  const recentTracks = tracksData?.tracks?.nodes || []
  const favoriteTracks = favoritesData?.favoriteTracks?.nodes || []

  if (!me || !profile) {
    // Show guest sidebar
    return (
      <div className="w-[280px] flex-shrink-0 hidden xl:block">
        <div className="sticky top-4 space-y-4">
          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl p-5 border border-cyan-500/20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Welcome to SoundChain</h3>
              <p className="text-gray-400 text-sm mb-4">Join the music revolution</p>
              <Link
                href="/login"
                className="block w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-neutral-900/80 rounded-2xl p-4 border border-neutral-800">
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Platform Stats</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Artists</span>
                <span className="text-cyan-400 font-medium">10K+</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tracks</span>
                <span className="text-purple-400 font-medium">50K+</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">NFTs Minted</span>
                <span className="text-pink-400 font-medium">5K+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[280px] flex-shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl overflow-hidden border border-cyan-500/20">
          {/* Cover Image or Gradient */}
          <div className="h-20 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 relative">
            {profile.coverPicture && (
              <img
                src={profile.coverPicture}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="px-4 pb-4 -mt-8 relative">
            <Link href={`/dex/users/${profile.userHandle}`} className="block">
              <div className="w-16 h-16 rounded-full ring-4 ring-neutral-900 overflow-hidden mb-2">
                <Avatar profile={profile} pixels={64} />
              </div>
            </Link>

            <Link href={`/dex/users/${profile.userHandle}`}>
              <h3 className="text-white font-bold text-lg hover:text-cyan-400 transition-colors">
                {profile.displayName || profile.userHandle}
              </h3>
            </Link>
            <p className="text-gray-500 text-sm">@{profile.userHandle}</p>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-medium">{profile.followerCount || 0}</span>
                <span className="text-gray-500">followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">{recentTracks.length || 0}</span>
                <span className="text-gray-500">tracks</span>
              </div>
            </div>
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
            <div className="grid grid-cols-3 gap-2">
              {recentTracks.slice(0, 6).map((track) => (
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
                    <Disc3 className="w-6 h-6 text-white" />
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
              <Link href="/dex/library" className="text-cyan-400 text-xs hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {favoriteTracks.slice(0, 6).map((track) => (
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
                    <Heart className="w-5 h-5 text-pink-400" fill="currentColor" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-neutral-900/80 rounded-2xl p-3 border border-neutral-800">
          <div className="space-y-1">
            <Link
              href="/dex/wallet"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Wallet</span>
            </Link>
            <Link
              href="/dex/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-all"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
