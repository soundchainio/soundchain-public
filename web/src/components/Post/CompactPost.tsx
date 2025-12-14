import { memo, useState } from 'react'
import { PostQuery, Track } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { Play, Pause, Heart, MessageCircle, Share2, Sparkles, BadgeCheck, Volume2 } from 'lucide-react'
import { IdentifySource, hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { EmoteRenderer } from '../EmoteRenderer'

interface CompactPostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
  onPostClick?: (postId: string) => void
  listView?: boolean
}

// Platform brand colors and logos for premium Web3 aesthetic
const PLATFORM_BRANDS: Record<string, { gradient: string; icon: string; glow: string }> = {
  [MediaProvider.YOUTUBE]: {
    gradient: 'from-red-600 via-red-500 to-red-700',
    icon: '▶️',
    glow: 'shadow-red-500/50'
  },
  [MediaProvider.SPOTIFY]: {
    gradient: 'from-green-500 via-emerald-400 to-green-600',
    icon: '🎵',
    glow: 'shadow-green-500/50'
  },
  [MediaProvider.SOUNDCLOUD]: {
    gradient: 'from-orange-500 via-amber-400 to-orange-600',
    icon: '☁️',
    glow: 'shadow-orange-500/50'
  },
  [MediaProvider.BANDCAMP]: {
    gradient: 'from-teal-500 via-cyan-400 to-teal-600',
    icon: '💿',
    glow: 'shadow-teal-500/50'
  },
  [MediaProvider.VIMEO]: {
    gradient: 'from-cyan-500 via-blue-400 to-cyan-600',
    icon: '🎬',
    glow: 'shadow-cyan-500/50'
  },
  [MediaProvider.INSTAGRAM]: {
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    icon: '📸',
    glow: 'shadow-pink-500/50'
  },
  [MediaProvider.TIKTOK]: {
    gradient: 'from-black via-pink-500 to-cyan-400',
    icon: '🎭',
    glow: 'shadow-pink-500/50'
  },
  [MediaProvider.TWITCH]: {
    gradient: 'from-purple-600 via-violet-500 to-purple-700',
    icon: '🎮',
    glow: 'shadow-purple-500/50'
  },
  [MediaProvider.FACEBOOK]: {
    gradient: 'from-blue-600 via-blue-500 to-blue-700',
    icon: '📘',
    glow: 'shadow-blue-500/50'
  },
  [MediaProvider.X]: {
    gradient: 'from-gray-800 via-gray-700 to-black',
    icon: '𝕏',
    glow: 'shadow-gray-500/50'
  },
}

const CompactPostComponent = ({ post, handleOnPlayClicked, onPostClick, listView = false }: CompactPostProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (!post || post.deleted) return null

  const isGuest = post?.isGuest && post?.walletAddress
  const hasProfile = !!post?.profile
  const hasTrack = post.track && !post.track.deleted
  const hasMediaLink = !!post.mediaLink
  const hasMedia = hasMediaLink || hasTrack

  // Identify media platform
  const mediaSource = post.mediaLink ? IdentifySource(post.mediaLink) : null
  const platformType = mediaSource?.type || 'unknown'
  const platformBrand = PLATFORM_BRANDS[platformType] || { gradient: 'from-cyan-600 via-purple-500 to-pink-500', icon: '🔗', glow: 'shadow-cyan-500/50' }

  // Check if ReactPlayer can show thumbnail with light mode (YouTube, Vimeo, Facebook)
  const canUseLightMode = post.mediaLink ? hasLazyLoadWithThumbnailSupport(post.mediaLink) : false

  // Track artwork
  const trackArtwork = hasTrack ? post.track?.artworkUrl : null

  // Handle card click to open post modal
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on play button or links
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return
    }
    if (onPostClick) {
      onPostClick(post.id)
    }
  }

  // Shared media render component for both views
  const renderMediaPreview = (aspectClass: string) => (
    <div className={`relative ${aspectClass} overflow-hidden bg-black`}>
      {/* Playing state - show actual player */}
      {isPlaying && hasMediaLink ? (
        <div className="w-full h-full bg-black">
          {canUseLightMode ? (
            // ReactPlayer for YouTube/Vimeo/Facebook - full controls
            <ReactPlayer
              url={post.mediaLink!}
              width="100%"
              height="100%"
              playing={true}
              controls
              playsinline
              light={false}
              config={{
                youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                vimeo: { playerOptions: { responsive: true, playsinline: true } },
              }}
            />
          ) : (
            // Direct iframe for Spotify/SoundCloud/Bandcamp - allows user interaction
            <iframe
              src={post.mediaLink!}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="w-full h-full"
            />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsPlaying(false) }}
            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/80 backdrop-blur flex items-center justify-center hover:bg-black transition-colors"
          >
            <Pause className="w-4 h-4 text-white" fill="white" />
          </button>
        </div>
      ) : (
        <>
          {/* Track artwork */}
          {trackArtwork ? (
            <img
              src={trackArtwork}
              alt={post.track?.title || 'Track'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : canUseLightMode && post.mediaLink ? (
            /* ReactPlayer with light mode for YouTube/Vimeo/Facebook - auto-fetches thumbnails! */
            <div className="w-full h-full">
              <ReactPlayer
                url={post.mediaLink}
                width="100%"
                height="100%"
                light={true}
                playIcon={<></>} // Hide default play icon, we have our own
                config={{
                  youtube: { playerVars: { modestbranding: 1, rel: 0 } },
                  vimeo: { playerOptions: { responsive: true } },
                }}
              />
            </div>
          ) : (
            /* Platform Branded Card for Spotify/SoundCloud/Bandcamp/etc - no thumbnail available */
            <div className={`w-full h-full bg-gradient-to-br ${platformBrand.gradient} relative overflow-hidden`}>
              {/* Animated mesh gradient background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.3),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.2),transparent_50%)]" />
                <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,transparent,rgba(255,255,255,0.1),transparent)]" />
              </div>

              {/* Animated particles/sparkles effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>

              {/* Platform icon - large and centered */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                  {platformBrand.icon}
                </span>
                <span className="mt-2 text-white/90 font-bold text-sm tracking-wider drop-shadow-lg uppercase">
                  {platformType === MediaProvider.SOUNDCLOUD ? 'SoundCloud' :
                   platformType === MediaProvider.SPOTIFY ? 'Spotify' :
                   platformType === MediaProvider.BANDCAMP ? 'Bandcamp' :
                   platformType.charAt(0).toUpperCase() + platformType.slice(1).toLowerCase()}
                </span>
              </div>

              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          {/* Platform badge - always show for media links */}
          {hasMediaLink && !hasTrack && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 z-10">
              <span className="text-sm">{platformBrand.icon}</span>
              <span className="text-[10px] text-white/90 font-semibold uppercase tracking-wider">
                {platformType === MediaProvider.SOUNDCLOUD ? 'SoundCloud' :
                 platformType === MediaProvider.SPOTIFY ? 'Spotify' :
                 platformType === MediaProvider.BANDCAMP ? 'Bandcamp' :
                 platformType === MediaProvider.YOUTUBE ? 'YouTube' :
                 platformType.charAt(0).toUpperCase() + platformType.slice(1).toLowerCase()}
              </span>
            </div>
          )}

          {/* Track info overlay */}
          {hasTrack && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-cyan-400" />
                <p className="text-white text-xs font-semibold truncate">{post.track?.title}</p>
              </div>
              <p className="text-neutral-400 text-[10px] truncate pl-4">{post.track?.artist}</p>
            </div>
          )}

          {/* Play button overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (hasTrack) {
                handleOnPlayClicked((post.track as Track).id)
              } else if (hasMediaLink) {
                setIsPlaying(true)
              }
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg ${platformBrand.glow} hover:scale-110 transition-transform`}>
              <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
            </div>
          </button>
        </>
      )}
    </div>
  )

  // LIST VIEW - Horizontal layout
  if (listView) {
    return (
      <div
        className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex gap-3 p-2">
          {/* Media - Left side */}
          {hasMedia && (
            <div className="w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden">
              {renderMediaPreview('w-full h-full')}
            </div>
          )}

          {/* Content - Right side */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            {/* User info */}
            <div className="flex items-center gap-2 mb-1">
              {isGuest ? (
                <>
                  <GuestAvatar walletAddress={post.walletAddress!} pixels={20} />
                  <span className="text-[10px] text-neutral-400 truncate">{formatWalletAddress(post.walletAddress!)}</span>
                </>
              ) : hasProfile ? (
                <Link href={`/dex/profile/${post.profile!.userHandle}`} className="flex items-center gap-1.5 hover:opacity-80" onClick={(e) => e.stopPropagation()}>
                  <Avatar profile={post.profile!} pixels={20} />
                  <span className="text-xs text-neutral-300 font-medium truncate">{post.profile!.displayName}</span>
                  {post.profile!.verified && <BadgeCheck className="w-3 h-3 text-cyan-400" />}
                </Link>
              ) : (
                <span className="text-xs text-neutral-500">Unknown user</span>
              )}
            </div>

            {/* Body text with animated emotes */}
            {post.body && (
              <p className="text-xs text-neutral-200 line-clamp-2">
                <EmoteRenderer text={post.body} />
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 mt-1">
              {(post.totalReactions || 0) > 0 && (
                <span className="flex items-center gap-1 text-neutral-500 text-[10px]">
                  <Heart className="w-3 h-3" /> {post.totalReactions}
                </span>
              )}
              {(post.commentCount || 0) > 0 && (
                <span className="flex items-center gap-1 text-neutral-500 text-[10px]">
                  <MessageCircle className="w-3 h-3" /> {post.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // GRID VIEW (compact cards) - Premium Web3 Design
  return (
    <div
      className="group relative bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        boxShadow: isHovered ? `0 20px 60px -15px rgba(0, 255, 255, 0.3)` : '0 4px 20px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/50 via-purple-500/30 to-pink-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Main content container */}
      <div className="relative bg-neutral-900 rounded-2xl overflow-hidden h-full flex flex-col">
        {/* Media Section - uses shared renderMediaPreview */}
        {hasMedia && renderMediaPreview('aspect-square')}

        {/* Text-only posts - glassmorphism card */}
        {!hasMedia && post.body && (
          <div className="aspect-square p-4 flex items-center justify-center bg-gradient-to-br from-cyan-900/20 via-purple-900/20 to-pink-900/20 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.1),transparent_70%)]" />
            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-cyan-400/50" />
            <p className="text-sm text-neutral-200 line-clamp-6 relative z-10 text-center leading-relaxed">
              <EmoteRenderer text={post.body} />
            </p>
          </div>
        )}

        {/* Footer - Premium glass effect */}
        <div className="p-3 border-t border-white/5 bg-gradient-to-r from-neutral-900/80 via-neutral-800/50 to-neutral-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {/* User info */}
            {isGuest ? (
              <div className="flex items-center gap-2 min-w-0">
                <GuestAvatar walletAddress={post.walletAddress!} pixels={24} />
                <div className="min-w-0">
                  <span className="text-xs text-neutral-300 truncate block">{formatWalletAddress(post.walletAddress!)}</span>
                </div>
                <span className="flex-shrink-0 text-[8px] px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 rounded-full font-medium border border-cyan-500/20">
                  Guest
                </span>
              </div>
            ) : hasProfile ? (
              <Link
                href={`/dex/profile/${post.profile!.userHandle}`}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full ring-2 ring-cyan-500/30 overflow-hidden">
                    <Avatar profile={post.profile!} pixels={24} />
                  </div>
                  {post.profile!.verified && (
                    <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-cyan-400 bg-neutral-900 rounded-full" />
                  )}
                </div>
                <span className="text-xs text-neutral-300 truncate font-medium">{post.profile!.displayName}</span>
                {/* POAP badges */}
                {post.profile!.badges && post.profile!.badges.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {post.profile!.badges.slice(0, 2).map((badge: string, i: number) => (
                      <span key={i} className="text-xs" title={badge}>
                        {badge.includes('🎵') ? '🎵' : badge.includes('🔥') ? '🔥' : badge.includes('🏆') ? '🏆' : '⭐'}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ) : (
              <span className="text-xs text-neutral-500">Unknown user</span>
            )}

            {/* Stats with glow effect */}
            <div className="flex items-center gap-3">
              {(post.totalReactions || 0) > 0 && (
                <span className="flex items-center gap-1 text-neutral-400 hover:text-pink-400 transition-colors cursor-pointer">
                  <Heart className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{post.totalReactions}</span>
                </span>
              )}
              {(post.commentCount || 0) > 0 && (
                <span className="flex items-center gap-1 text-neutral-400 hover:text-cyan-400 transition-colors cursor-pointer">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{post.commentCount}</span>
                </span>
              )}
              <span className="flex items-center text-neutral-500 hover:text-white transition-colors cursor-pointer">
                <Share2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CompactPost = memo(CompactPostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.totalReactions === next.post?.totalReactions &&
         prev.listView === next.listView
})
