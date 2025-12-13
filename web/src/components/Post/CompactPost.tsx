import { memo, useState } from 'react'
import { PostQuery, Track } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { Play, Heart, MessageCircle, Music, Video, Image as ImageIcon, ExternalLink, BadgeCheck } from 'lucide-react'
import { IdentifySource, hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

interface CompactPostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
  listView?: boolean
}

// Helper to get thumbnail URL for various media providers
const getThumbnailUrl = (mediaLink: string): { url: string | null; icon: typeof Play | null; platform: string; color: string } => {
  const source = IdentifySource(mediaLink)

  switch (source.type) {
    case MediaProvider.YOUTUBE: {
      const match = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
      if (match?.[1]) {
        return { url: `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`, icon: Play, platform: 'YouTube', color: 'from-red-600 to-red-800' }
      }
      break
    }
    case MediaProvider.VIMEO: {
      // Vimeo - cyan/blue gradient
      return { url: null, icon: Video, platform: 'Vimeo', color: 'from-cyan-500 to-blue-600' }
    }
    case MediaProvider.SPOTIFY: {
      // Spotify - green gradient
      return { url: null, icon: Music, platform: 'Spotify', color: 'from-green-500 to-green-700' }
    }
    case MediaProvider.SOUNDCLOUD: {
      // SoundCloud - orange gradient
      return { url: null, icon: Music, platform: 'SoundCloud', color: 'from-orange-500 to-orange-700' }
    }
    case MediaProvider.INSTAGRAM: {
      // Instagram - pink/purple gradient
      return { url: null, icon: ImageIcon, platform: 'Instagram', color: 'from-pink-500 via-purple-500 to-orange-500' }
    }
    case MediaProvider.TIKTOK: {
      // TikTok - cyan/pink gradient
      return { url: null, icon: Video, platform: 'TikTok', color: 'from-cyan-400 to-pink-500' }
    }
    case MediaProvider.BANDCAMP: {
      // Bandcamp - teal gradient
      return { url: null, icon: Music, platform: 'Bandcamp', color: 'from-teal-500 to-cyan-600' }
    }
    case MediaProvider.X: {
      // X/Twitter - gray/black
      return { url: null, icon: ExternalLink, platform: 'X', color: 'from-gray-700 to-gray-900' }
    }
    case MediaProvider.TWITCH: {
      // Twitch - purple gradient
      return { url: null, icon: Video, platform: 'Twitch', color: 'from-purple-600 to-purple-800' }
    }
    case MediaProvider.FACEBOOK: {
      // Facebook - blue gradient
      return { url: null, icon: Video, platform: 'Facebook', color: 'from-blue-600 to-blue-800' }
    }
    default:
      return { url: null, icon: ExternalLink, platform: 'Link', color: 'from-gray-600 to-gray-800' }
  }
  return { url: null, icon: Play, platform: 'Media', color: 'from-gray-600 to-gray-800' }
}

const CompactPostComponent = ({ post, handleOnPlayClicked, listView = false }: CompactPostProps) => {
  const [isPlaying, setIsPlaying] = useState(false)

  if (!post || post.deleted) return null

  const isGuest = post?.isGuest && post?.walletAddress
  const hasTrack = post.track && !post.track.deleted
  const hasMediaLink = !!post.mediaLink
  const hasMedia = hasMediaLink || hasTrack

  // Get the thumbnail image - prioritize track artwork, then media thumbnails
  const mediaInfo = post.mediaLink ? getThumbnailUrl(post.mediaLink) : null
  const thumbnailUrl = hasTrack
    ? post.track?.artworkUrl
    : mediaInfo?.url

  // Check if media link supports ReactPlayer
  const canPlayInline = hasMediaLink && hasLazyLoadWithThumbnailSupport(post.mediaLink!)

  // List view - horizontal layout with larger media
  if (listView) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-colors">
        <div className="flex gap-3 p-3">
          {/* Media Section - Left side for list view */}
          {hasMedia && (
            <div className="relative w-40 h-24 flex-shrink-0 bg-neutral-800 rounded-lg overflow-hidden">
              {/* Playable embed */}
              {canPlayInline && isPlaying ? (
                <ReactPlayer
                  url={post.mediaLink!}
                  width="100%"
                  height="100%"
                  playing={true}
                  controls
                  playsinline
                  config={{
                    youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                  }}
                />
              ) : thumbnailUrl ? (
                <>
                  <img
                    src={thumbnailUrl}
                    alt={hasTrack ? post.track?.title || 'Track' : 'Media'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Play overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (hasTrack) {
                        handleOnPlayClicked((post.track as Track).id)
                      } else if (canPlayInline) {
                        setIsPlaying(true)
                      }
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
                    </div>
                  </button>
                </>
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${mediaInfo?.color || 'from-cyan-900/20 to-purple-900/20'}`}>
                  {mediaInfo?.icon ? (
                    <>
                      {(() => {
                        const IconComponent = mediaInfo.icon
                        return <IconComponent className="w-10 h-10 text-white mb-2 drop-shadow-lg" />
                      })()}
                      <span className="text-sm text-white font-bold drop-shadow-lg">{mediaInfo.platform}</span>
                    </>
                  ) : (
                    <Play className="w-8 h-8 text-white" />
                  )}
                  {canPlayInline && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsPlaying(true)
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content Section - Right side for list view */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Header with user info */}
            <div className="flex items-center gap-2 mb-1">
              {isGuest ? (
                <>
                  <GuestAvatar walletAddress={post.walletAddress!} pixels={24} />
                  <span className="text-xs text-neutral-400 truncate">{formatWalletAddress(post.walletAddress!)}</span>
                  <span className="text-[8px] px-1 py-0.5 bg-neutral-700 text-neutral-300 rounded font-medium">Guest</span>
                </>
              ) : (
                <Link href={`/profiles/${post.profile?.userHandle}`} className="flex items-center gap-2 hover:opacity-80">
                  <div className="relative">
                    <Avatar profile={post.profile!} pixels={24} />
                    {post.profile?.verified && (
                      <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-cyan-400 bg-neutral-900 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-neutral-300 font-medium truncate">{post.profile?.displayName}</span>
                  {post.profile?.badges && post.profile.badges.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {post.profile.badges.slice(0, 2).map((badge: string, i: number) => (
                        <span key={i} className="text-[10px]">{badge.includes('🎵') ? '🎵' : badge.includes('🔥') ? '🔥' : '🏆'}</span>
                      ))}
                    </div>
                  )}
                </Link>
              )}
            </div>

            {/* Body text */}
            {post.body && (
              <p className="text-sm text-neutral-200 line-clamp-2 mb-1">{post.body}</p>
            )}

            {/* Track title if exists */}
            {hasTrack && (
              <p className="text-xs text-cyan-400 truncate mb-1">{post.track?.title} - {post.track?.artist}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-neutral-500">
              {(post.totalReactions || 0) > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <Heart className="w-3 h-3" /> {post.totalReactions}
                </span>
              )}
              {(post.commentCount || 0) > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <MessageCircle className="w-3 h-3" /> {post.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view (compact cards) - default
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden h-full flex flex-col hover:border-neutral-700 transition-colors group">
      {/* Media/Thumbnail Section */}
      {hasMedia && (
        <div className="relative aspect-square bg-neutral-800 overflow-hidden">
          {/* Playable embed - show player when clicked */}
          {canPlayInline && isPlaying ? (
            <ReactPlayer
              url={post.mediaLink!}
              width="100%"
              height="100%"
              playing={true}
              controls
              playsinline
              config={{
                youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
              }}
            />
          ) : thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={hasTrack ? post.track?.title || 'Track' : 'Media'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Play overlay - visible on hover or always for media */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (hasTrack) {
                    handleOnPlayClicked((post.track as Track).id)
                  } else if (canPlayInline) {
                    setIsPlaying(true)
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
                </div>
              </button>
            </>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${mediaInfo?.color || 'from-cyan-900/20 to-purple-900/20'} relative`}>
              {mediaInfo?.icon ? (
                <>
                  {(() => {
                    const IconComponent = mediaInfo.icon
                    return <IconComponent className="w-10 h-10 text-white mb-2 drop-shadow-lg" />
                  })()}
                  <span className="text-sm text-white font-bold drop-shadow-lg">{mediaInfo.platform}</span>
                </>
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
              {/* Play button overlay for media links */}
              {canPlayInline && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsPlaying(true)
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Play button for tracks - ALWAYS visible */}
          {hasTrack && !isPlaying && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleOnPlayClicked((post.track as Track).id)
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
              </div>
            </button>
          )}

          {/* Track info overlay */}
          {hasTrack && !isPlaying && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-semibold truncate">{post.track?.title}</p>
              <p className="text-neutral-400 text-[10px] truncate">{post.track?.artist}</p>
            </div>
          )}

          {/* Media link platform badge */}
          {hasMediaLink && !hasTrack && !isPlaying && mediaInfo?.platform && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium">
              {mediaInfo.platform}
            </div>
          )}
        </div>
      )}

      {/* Text-only posts get body preview */}
      {!hasMedia && post.body && (
        <div className="p-3 flex-1 bg-gradient-to-br from-cyan-900/10 to-purple-900/10">
          <p className="text-sm text-neutral-200 line-clamp-4">{post.body}</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-neutral-800 flex items-center justify-between">
        {isGuest ? (
          // Guest post footer
          <div className="flex items-center gap-1.5 min-w-0">
            <GuestAvatar walletAddress={post.walletAddress!} pixels={20} />
            <span className="text-[10px] text-neutral-400 truncate">{formatWalletAddress(post.walletAddress!)}</span>
            <span className="text-[8px] px-1 py-0.5 bg-neutral-700 text-neutral-300 rounded font-medium">Guest</span>
          </div>
        ) : (
          // Regular user footer
          <Link href={`/profiles/${post.profile?.userHandle}`} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
            <div className="relative flex-shrink-0">
              <Avatar profile={post.profile!} pixels={20} />
              {/* Verified badge */}
              {post.profile?.verified && (
                <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-cyan-400 bg-neutral-900 rounded-full" />
              )}
            </div>
            <span className="text-[10px] text-neutral-400 truncate">{post.profile?.displayName}</span>
            {/* POAP badges - show first 2 */}
            {post.profile?.badges && post.profile.badges.length > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {post.profile.badges.slice(0, 2).map((badge: string, i: number) => (
                  <span key={i} className="text-[8px]" title={badge}>{badge.includes('🎵') ? '🎵' : badge.includes('🔥') ? '🔥' : '🏆'}</span>
                ))}
                {post.profile.badges.length > 2 && (
                  <span className="text-[8px] text-neutral-500">+{post.profile.badges.length - 2}</span>
                )}
              </div>
            )}
          </Link>
        )}
        <div className="flex items-center gap-2 text-neutral-500">
          {(post.totalReactions || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Heart className="w-3 h-3" /> {post.totalReactions}
            </span>
          )}
          {(post.commentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <MessageCircle className="w-3 h-3" /> {post.commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export const CompactPost = memo(CompactPostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.totalReactions === next.post?.totalReactions
})
