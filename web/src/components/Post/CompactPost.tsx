import { memo } from 'react'
import { PostQuery, Track } from 'lib/graphql'
import Link from 'next/link'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { Play, Heart, MessageCircle, Music, Video, Image as ImageIcon, ExternalLink, BadgeCheck } from 'lucide-react'
import { IdentifySource } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

interface CompactPostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
}

// Helper to get thumbnail URL for various media providers
const getThumbnailUrl = (mediaLink: string): { url: string | null; icon: typeof Play | null; platform: string } => {
  const source = IdentifySource(mediaLink)

  switch (source.type) {
    case MediaProvider.YOUTUBE: {
      const match = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
      if (match?.[1]) {
        return { url: `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`, icon: Play, platform: 'YouTube' }
      }
      break
    }
    case MediaProvider.VIMEO: {
      // Vimeo thumbnails require API call, use icon fallback
      return { url: null, icon: Video, platform: 'Vimeo' }
    }
    case MediaProvider.SPOTIFY: {
      return { url: null, icon: Music, platform: 'Spotify' }
    }
    case MediaProvider.SOUNDCLOUD: {
      return { url: null, icon: Music, platform: 'SoundCloud' }
    }
    case MediaProvider.INSTAGRAM: {
      return { url: null, icon: ImageIcon, platform: 'Instagram' }
    }
    case MediaProvider.TIKTOK: {
      return { url: null, icon: Video, platform: 'TikTok' }
    }
    case MediaProvider.BANDCAMP: {
      return { url: null, icon: Music, platform: 'Bandcamp' }
    }
    case MediaProvider.X: {
      return { url: null, icon: ExternalLink, platform: 'X' }
    }
    case MediaProvider.TWITCH: {
      return { url: null, icon: Video, platform: 'Twitch' }
    }
    case MediaProvider.FACEBOOK: {
      return { url: null, icon: Video, platform: 'Facebook' }
    }
    default:
      return { url: null, icon: ExternalLink, platform: 'Link' }
  }
  return { url: null, icon: Play, platform: 'Media' }
}

const CompactPostComponent = ({ post, handleOnPlayClicked }: CompactPostProps) => {
  if (!post || post.deleted) return null

  const isGuest = post?.isGuest && post?.walletAddress
  const hasTrack = post.track && !post.track.deleted
  const hasMedia = post.mediaLink || hasTrack

  // Get the thumbnail image - prioritize track artwork, then media thumbnails
  const mediaInfo = post.mediaLink ? getThumbnailUrl(post.mediaLink) : null
  const thumbnailUrl = hasTrack
    ? post.track?.artworkUrl
    : mediaInfo?.url

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden h-full flex flex-col hover:border-neutral-700 transition-colors group">
      {/* Media/Thumbnail Section */}
      {hasMedia && (
        <div className="relative aspect-square bg-neutral-800 overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={hasTrack ? post.track?.title || 'Track' : 'Media'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-900/20 to-purple-900/20">
              {mediaInfo?.icon ? (
                <>
                  {(() => {
                    const IconComponent = mediaInfo.icon
                    return <IconComponent className="w-8 h-8 text-cyan-400 mb-1" />
                  })()}
                  <span className="text-[10px] text-neutral-400 font-medium">{mediaInfo.platform}</span>
                </>
              ) : (
                <Play className="w-8 h-8 text-neutral-500" />
              )}
            </div>
          )}

          {/* Play button for tracks - ALWAYS visible */}
          {hasTrack && (
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
          {hasTrack && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-semibold truncate">{post.track?.title}</p>
              <p className="text-neutral-400 text-[10px] truncate">{post.track?.artist}</p>
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
