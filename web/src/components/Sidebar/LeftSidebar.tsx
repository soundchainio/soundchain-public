'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useMe } from 'hooks/useMe'
import { useFavoriteTracksQuery, useTracksQuery, useGetUserPlaylistsQuery, SortTrackField, SortOrder } from 'lib/graphql'
import { Avatar } from '../Avatar'
import { Music, Users, Heart, Disc3, Settings, Wallet, ListMusic, Rocket, ExternalLink, Share2, Megaphone } from 'lucide-react'

// Announcement type from /v1/feed API
interface Announcement {
  id: string
  title: string
  content: string
  imageUrl?: string
  link?: string
  type?: string
  companyName?: string
  publishedAt?: string
  createdAt?: string
  tags?: string[]
}

export const LeftSidebar = () => {
  const me = useMe()
  const profile = me?.profile

  // Fetch announcements for sidebar (desktop only)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const response = await fetch('https://19ne212py4.execute-api.us-east-1.amazonaws.com/production/v1/feed?limit=3')
        if (response.ok) {
          const data = await response.json()
          setAnnouncements(data.announcements || [])
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setAnnouncementsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

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

  // Get user's playlists
  const { data: playlistsData } = useGetUserPlaylistsQuery({
    variables: { page: { first: 6 } },
    skip: !me,
  })

  const recentTracks = tracksData?.tracks?.nodes || []
  const favoriteTracks = favoritesData?.favoriteTracks?.nodes || []
  const playlists = playlistsData?.getUserPlaylists?.nodes || []

  if (!me || !profile) {
    // Show guest sidebar with announcements
    return (
      <div className="w-[280px] flex-shrink-0 hidden xl:block">
        <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
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

          {/* Announcements - Fully Expanded */}
          {announcements.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Announcements</h4>
              </div>
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl overflow-hidden border border-cyan-500/30 hover:border-cyan-400/50 transition-all"
                >
                  {/* Hero Image */}
                  {announcement.imageUrl && (
                    <div className="relative w-full h-32 overflow-hidden">
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <span className="inline-block px-2 py-0.5 bg-cyan-500/90 text-black text-[10px] font-bold rounded mb-1">
                          {announcement.type?.replace('_', ' ') || 'UPDATE'}
                        </span>
                        <h3 className="text-white font-bold text-sm drop-shadow-lg line-clamp-2">{announcement.title}</h3>
                      </div>
                    </div>
                  )}

                  {/* Content - Fully Expanded */}
                  <div className="p-4">
                    {!announcement.imageUrl && (
                      <>
                        <span className="inline-block px-2 py-0.5 bg-cyan-500/90 text-black text-[10px] font-bold rounded mb-2">
                          {announcement.type?.replace('_', ' ') || 'UPDATE'}
                        </span>
                        <h3 className="text-white font-bold text-sm mb-2">{announcement.title}</h3>
                      </>
                    )}

                    {/* Author & Date */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                        <Rocket className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-cyan-400 text-xs font-medium">{announcement.companyName || 'SoundChain'}</span>
                      <span className="text-gray-600 text-xs">•</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(announcement.publishedAt || announcement.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>

                    {/* Full Content - No truncation! */}
                    <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap mb-3">
                      {announcement.content}
                    </p>

                    {/* Tags */}
                    {announcement.tags && announcement.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {announcement.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-[10px]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {announcement.link && (
                        <a
                          href={announcement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-500 text-black text-xs font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                        >
                          Visit Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          navigator.share?.({
                            title: announcement.title,
                            text: announcement.content?.substring(0, 100) + '...',
                            url: window.location.href,
                          }).catch(() => {})
                        }}
                        className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
        {/* Your Playlists - Primary Section */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl overflow-hidden border border-green-500/30">
          {/* Header with gradient */}
          <div className="px-4 py-3 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border-b border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-bold">Your Playlists</h3>
              </div>
              <Link
                href="/dex/playlist"
                className="text-xs text-green-400 hover:text-green-300 font-medium"
              >
                View All
              </Link>
            </div>
          </div>

          {/* Playlist Items */}
          <div className="p-3">
            {playlists.length > 0 ? (
              <div className="space-y-2">
                {playlists.slice(0, 5).map((playlist) => (
                  <Link
                    key={playlist.id}
                    href={`/dex/playlist/${playlist.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-800/80 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-700 flex-shrink-0 ring-2 ring-neutral-700 group-hover:ring-green-500/50 transition-all">
                      {playlist.artworkUrl ? (
                        <img
                          src={playlist.artworkUrl}
                          alt={playlist.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                          <ListMusic className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-green-400 transition-colors">
                        {playlist.title}
                      </p>
                      <p className="text-gray-500 text-xs flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {playlist.tracks?.nodes?.length || 0} tracks
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <ListMusic className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-3">No playlists yet</p>
                <Link
                  href="/dex/playlist"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors"
                >
                  <ListMusic className="w-4 h-4" />
                  Create Playlist
                </Link>
              </div>
            )}
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
