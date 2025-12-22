import { memo, useState, useRef } from 'react'
import { FastAudioPlayer } from '../FastAudioPlayer'
import { PostQuery, Track } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { Play, Heart, MessageCircle, Share2, BadgeCheck, Volume2, VolumeX } from 'lucide-react'
import { IdentifySource, hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { EmoteRenderer } from '../EmoteRenderer'

// Helper to extract YouTube video ID and generate thumbnail URL
const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }
  return null
}

// Get embed height for platform (scaled for compact cards)
const getCompactEmbedHeight = (mediaType: string) => {
  switch (mediaType) {
    // Audio platforms
    case MediaProvider.BANDCAMP: return '320px'
    case MediaProvider.SPOTIFY: return '280px'
    case MediaProvider.SOUNDCLOUD: return '166px'
    // Social platforms
    case MediaProvider.INSTAGRAM: return '320px'
    case MediaProvider.TIKTOK: return '400px'
    case MediaProvider.X: return '280px'
    case MediaProvider.TWITCH: return '280px'
    case MediaProvider.DISCORD: return '280px'
    case MediaProvider.CUSTOM_HTML: return '280px'
    default: return '200px'
  }
}


interface CompactPostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
  onPostClick?: (postId: string) => void
  listView?: boolean
}


const CompactPostComponent = ({ post, handleOnPlayClicked, onPostClick, listView = false }: CompactPostProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isMuted, setIsMuted] = useState(true) // Videos start muted for autoplay
  const videoRef = useRef<HTMLVideoElement>(null)

  if (!post || post.deleted) return null

  const isGuest = post?.isGuest && post?.walletAddress
  const hasProfile = !!post?.profile
  const hasTrack = post.track && !post.track.deleted
  const hasMediaLink = !!post.mediaLink

  // Check for uploaded media (images/videos from posts)
  const postWithMedia = post as typeof post & { uploadedMediaUrl?: string | null; uploadedMediaType?: string | null; mediaExpiresAt?: string | null; isEphemeral?: boolean | null }
  const uploadedMediaUrl = postWithMedia.uploadedMediaUrl
  const uploadedMediaType = postWithMedia.uploadedMediaType
  const hasUploadedMedia = !!uploadedMediaUrl
  const mediaExpiresAt = postWithMedia.mediaExpiresAt ? new Date(postWithMedia.mediaExpiresAt) : null
  const isExpired = mediaExpiresAt && mediaExpiresAt < new Date()

  const hasMedia = hasMediaLink || hasTrack || (hasUploadedMedia && !isExpired)

  // Identify media platform
  const mediaSource = post.mediaLink ? IdentifySource(post.mediaLink) : null
  const platformType = mediaSource?.type || 'unknown'

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
      {/* Uploaded media (images/videos/audio) - priority display */}
      {hasUploadedMedia && !isExpired && (
        <>
          {uploadedMediaType === 'image' && (
            <img
              src={uploadedMediaUrl!}
              alt="Post media"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="eager"
            />
          )}
          {uploadedMediaType === 'video' && (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={uploadedMediaUrl!}
                className="w-full h-full object-cover"
                playsInline
                muted={isMuted}
                loop
                autoPlay
              />
              {/* Unmute button overlay - tap to unmute like IG/X */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newMuted = !isMuted
                  if (videoRef.current) {
                    videoRef.current.muted = newMuted
                  }
                  setIsMuted(newMuted)
                }}
                className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur flex items-center justify-center hover:bg-black/90 transition-colors"
                title={isMuted ? 'Tap to unmute' : 'Tap to mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
              {/* Muted indicator hint */}
              {isMuted && (
                <div className="absolute bottom-2 left-2 z-10 px-2 py-1 bg-black/70 backdrop-blur rounded-full text-white text-[10px] flex items-center gap-1">
                  <VolumeX className="w-3 h-3" />
                  <span>Tap to unmute</span>
                </div>
              )}
            </div>
          )}
          {uploadedMediaType === 'audio' && (
            <div
              className="relative w-full h-full bg-gradient-to-br from-cyan-900/50 via-purple-900/50 to-pink-900/50 flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <FastAudioPlayer
                src={uploadedMediaUrl!}
                loop={true}
                compact={true}
                className="w-full h-full"
              />
            </div>
          )}
        </>
      )}

      {/* Media link - Legacy-style iframe embeds */}
      {!hasUploadedMedia && hasMediaLink && post.mediaLink && !hasTrack ? (
        <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
          {hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
            // YouTube, Vimeo, Facebook - use ReactPlayer (legacy style)
            <ReactPlayer
              width="100%"
              height="100%"
              url={post.mediaLink}
              playsinline
              controls
              light={getYouTubeThumbnail(post.mediaLink) || true}
              pip
              config={{
                youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                vimeo: { playerOptions: { responsive: true, playsinline: true } },
                facebook: { appId: '' },
              }}
            />
          ) : (
            // All other platforms (audio + social) - airtight iframe embed
            <iframe
              frameBorder="0"
              className="w-full h-full bg-black"
              style={{ height: getCompactEmbedHeight(platformType) }}
              src={post.mediaLink.replace(/^http:/, 'https:')}
              title="Media"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      ) : !hasUploadedMedia && hasTrack && (
        <>
          {/* Track artwork */}
          {trackArtwork && (
            <img
              src={trackArtwork}
              alt={post.track?.title || 'Track'}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          )}

          {/* Track info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <p className="text-white text-xs font-semibold truncate">{post.track?.title}</p>
            </div>
            <p className="text-neutral-400 text-[10px] truncate pl-4">{post.track?.artist}</p>
          </div>

          {/* Play button overlay for tracks */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOnPlayClicked((post.track as Track).id)
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all z-10"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/50 opacity-80 group-hover:opacity-100 hover:scale-110 transition-all">
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
                <Link href={`/dex/users/${post.profile!.userHandle}`} className="flex items-center gap-1.5 hover:opacity-80" onClick={(e) => e.stopPropagation()}>
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

        {/* Text-only posts - clean card with emotes rendered inline */}
        {!hasMedia && post.body && (
          <div className="aspect-square flex flex-col bg-gradient-to-br from-neutral-800/50 via-neutral-900 to-neutral-800/50 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05),transparent_70%)]" />

            {/* Main text content with emotes - centered */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-sm text-neutral-200 line-clamp-5 text-center leading-relaxed [&_img]:w-6 [&_img]:h-6 [&_img]:inline-block [&_img]:align-middle">
                <EmoteRenderer text={post.body} />
              </div>
            </div>
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
                href={`/dex/users/${post.profile!.userHandle}`}
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
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const postUrl = `${window.location.origin}/posts/${post.id}`
                  if (navigator.share) {
                    navigator.share({
                      title: 'SoundChain',
                      text: 'Check out this post on SoundChain!',
                      url: postUrl,
                    }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(postUrl)
                  }
                }}
                className="flex items-center text-neutral-500 hover:text-white transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
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
