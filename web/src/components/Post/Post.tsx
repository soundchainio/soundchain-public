import { memo } from 'react'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { PostQuery, Role, Track } from 'lib/graphql'
import Link from 'next/link'
import Image from 'next/image'
import ReactPlayer from 'react-player'
import { Clock } from 'lucide-react'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'

// Helper to extract YouTube video ID and generate thumbnail URL
const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }
  return null
}

// Helper to get Vimeo thumbnail (requires oEmbed, fallback to true)
const getVimeoThumbnail = (url: string): boolean => {
  return true // Let ReactPlayer handle Vimeo thumbnails
}

import { Avatar } from '../Avatar'
import { GuestAvatar, formatWalletAddress } from '../GuestAvatar'
import { DisplayName } from '../DisplayName'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { NotAvailableMessage } from '../NotAvailableMessage'
import { Timestamp } from '../Timestamp'
import { PostActions } from './PostActions'
import { PostSkeleton } from './PostSkeleton'
import { PostStats } from './PostStats'
import { RepostPreview } from './RepostPreview'
import { PostBodyWithEmotes } from '../EmoteRenderer'
import { AutoplayVideo } from '../AutoplayMedia'
import { FastAudioPlayer } from '../FastAudioPlayer'

interface PostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
}

const PostComponent = ({ post, handleOnPlayClicked }: PostProps) => {
  const me = useMe()
  const { dispatchShowAuthorActionsModal } = useModalDispatch()

  if (!post) return <PostSkeleton />

  const isGuest = post?.isGuest && post?.walletAddress
  const hasProfile = !!post?.profile
  const isAuthor = isGuest
    ? false // Guests can't edit through regular flow
    : post?.profile?.id == me?.profile?.id
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember)

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal({
      showAuthorActions: true,
      authorActionsType: AuthorActionsType.POST,
      authorActionsId: post.id,
      showOnlyDeleteOption: !isAuthor,
    })
  }

  if (post?.deleted) {
    return <NotAvailableMessage type="post" />
  }

  // Check if post has any media (embed links, tracks, reposts, or uploaded ephemeral media)
  // These fields are requested via PostComponentFields fragment but the prop type may not include them
  const postWithMedia = post as typeof post & { uploadedMediaUrl?: string | null; uploadedMediaType?: string | null; mediaExpiresAt?: string | null; isEphemeral?: boolean | null }
  const hasUploadedMedia = !!postWithMedia.uploadedMediaUrl
  const isEphemeral = !!postWithMedia.isEphemeral
  const mediaExpiresAt = postWithMedia.mediaExpiresAt ? new Date(postWithMedia.mediaExpiresAt) : null
  const isExpired = mediaExpiresAt && mediaExpiresAt < new Date()
  const uploadedMediaUrl = postWithMedia.uploadedMediaUrl
  const uploadedMediaType = postWithMedia.uploadedMediaType

  const hasMedia = post.mediaLink || post.track || post.repostId || hasUploadedMedia

  // Calculate time remaining for ephemeral posts
  const getTimeRemaining = () => {
    if (!mediaExpiresAt) return null
    const now = new Date()
    const diff = mediaExpiresAt.getTime() - now.getTime()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <article className="bg-black border border-neutral-800 rounded-lg overflow-hidden mb-4">
      {/* Header - Instagram style */}
      <header className="flex items-center justify-between px-3 py-2.5">
        {isGuest ? (
          // Guest post header - wallet address only
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <GuestAvatar walletAddress={post.walletAddress!} pixels={32} className="ring-2 ring-neutral-700" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-neutral-100">
                  {formatWalletAddress(post.walletAddress!)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
                  Guest
                </span>
              </div>
              <Timestamp
                datetime={post.createdAt}
                edited={post.createdAt !== post.updatedAt || false}
                className="text-xs text-neutral-500"
                small
              />
            </div>
          </div>
        ) : hasProfile ? (
          // Regular user post header
          <Link href={`/dex/users/${post.profile!.userHandle}`} className="flex items-center gap-2.5 min-w-0 flex-1">
            <Avatar profile={post.profile!} pixels={32} className="flex-shrink-0 ring-2 ring-neutral-700" />
            <div className="min-w-0 flex-1">
              <DisplayName
                name={post.profile!.displayName || ''}
                verified={post.profile!.verified}
                teamMember={post.profile!.teamMember}
                badges={post.profile!.badges}
                className="text-sm font-semibold"
              />
              <Timestamp
                datetime={post.createdAt}
                edited={post.createdAt !== post.updatedAt || false}
                className="text-xs text-neutral-500"
                small
              />
            </div>
          </Link>
        ) : (
          // Fallback when profile is null
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center ring-2 ring-neutral-700">
              <span className="text-neutral-400 text-xs">?</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-neutral-400">Unknown user</span>
              <Timestamp
                datetime={post.createdAt}
                edited={post.createdAt !== post.updatedAt || false}
                className="text-xs text-neutral-500"
                small
              />
            </div>
          </div>
        )}
        <button
          aria-label="More options"
          className="p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
          onClick={onEllipsisClick}
        >
          <Ellipsis className="h-5 w-5 text-neutral-400" />
        </button>
      </header>

      {/* Body text - Instagram style padding */}
      {post.body && (
        <div className="px-4 pb-3">
          <PostBodyWithEmotes
            body={post.body}
            className="text-sm text-neutral-100 whitespace-pre-wrap break-words leading-relaxed"
            linkify
          />
        </div>
      )}

      {/* Media Section - Full width like Instagram */}
      {hasMedia && (
        <div className="relative bg-black">
          {/* Uploaded ephemeral media (24h stories) */}
          {hasUploadedMedia && !isExpired && (
            <div className="relative">
              {/* Ephemeral badge */}
              {isEphemeral && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 bg-amber-500/90 rounded-full text-xs font-medium text-black">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeRemaining()}</span>
                </div>
              )}

              {/* Image - full width, natural height like Instagram */}
              {uploadedMediaType === 'image' && uploadedMediaUrl && (
                <img
                  src={uploadedMediaUrl}
                  alt="Post media"
                  className="w-full h-auto"
                  loading="eager"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<div class="p-4 flex items-center justify-center text-neutral-500"><span class="text-sm">Image unavailable</span></div>'
                    }
                  }}
                />
              )}

              {/* Video - autoplay on scroll like IG/X */}
              {uploadedMediaType === 'video' && uploadedMediaUrl && (
                <AutoplayVideo
                  src={uploadedMediaUrl}
                  className="w-full"
                  muted={true}
                  loop={true}
                />
              )}

              {/* Audio - lightning fast playback with preloading */}
              {uploadedMediaType === 'audio' && uploadedMediaUrl && (
                <FastAudioPlayer
                  src={uploadedMediaUrl}
                  loop={true}
                  className="m-3"
                />
              )}

              {/* Fallback for unknown media type - try to render as image */}
              {uploadedMediaUrl && !['image', 'video', 'audio'].includes(uploadedMediaType || '') && (
                <img
                  src={uploadedMediaUrl}
                  alt="Post media"
                  className="w-full h-auto"
                  loading="eager"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<div class="p-4 flex items-center justify-center text-neutral-500"><span class="text-sm">Media unavailable</span></div>'
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Expired media placeholder */}
          {hasUploadedMedia && isExpired && (
            <div className="p-8 flex flex-col items-center justify-center text-neutral-500 bg-neutral-800/50">
              <Clock className="w-8 h-8 mb-2" />
              <span className="text-sm">Media expired</span>
            </div>
          )}

          {/* Embedded video/link */}
          {post.mediaLink && (
            hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
              <div className="relative w-full aspect-video">
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
                  }}
                />
              </div>
            ) : (
              // Iframe embed for Spotify, SoundCloud, Bandcamp, etc.
              (() => {
                const mediaType = IdentifySource(post.mediaLink).type
                const mediaUrl = post.mediaLink?.replace(/^http:/, 'https:') || ''

                // Check if URL is a proper embed URL (not raw page URL)
                const isProperEmbed =
                  mediaUrl.includes('EmbeddedPlayer') || // Bandcamp
                  mediaUrl.includes('open.spotify.com/embed') || // Spotify
                  mediaUrl.includes('w.soundcloud.com/player') || // SoundCloud
                  mediaUrl.includes('player.vimeo.com') || // Vimeo
                  mediaUrl.includes('youtube.com/embed') || // YouTube
                  mediaUrl.includes('instagram.com/embed') || // Instagram
                  mediaUrl.includes('tiktok.com/embed') || // TikTok
                  mediaUrl.includes('platform.twitter.com/embed') || // X/Twitter
                  mediaUrl.includes('player.twitch.tv') || // Twitch
                  mediaUrl.includes('facebook.com/plugins') // Facebook

                // If not a proper embed URL, show a clickable link card instead
                if (!isProperEmbed) {
                  const platformName = mediaType === MediaProvider.BANDCAMP ? 'Bandcamp' :
                                      mediaType === MediaProvider.SPOTIFY ? 'Spotify' :
                                      mediaType === MediaProvider.SOUNDCLOUD ? 'SoundCloud' :
                                      mediaType === MediaProvider.INSTAGRAM ? 'Instagram' :
                                      mediaType === MediaProvider.TIKTOK ? 'TikTok' :
                                      mediaType === MediaProvider.X ? 'X' : 'Link'
                  const platformIcon = mediaType === MediaProvider.BANDCAMP ? '💿' :
                                      mediaType === MediaProvider.SPOTIFY ? '🎵' :
                                      mediaType === MediaProvider.SOUNDCLOUD ? '☁️' :
                                      mediaType === MediaProvider.INSTAGRAM ? '📸' :
                                      mediaType === MediaProvider.TIKTOK ? '🎭' :
                                      mediaType === MediaProvider.X ? '𝕏' : '🔗'
                  return (
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{platformIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold">Open on {platformName}</p>
                          <p className="text-neutral-400 text-sm truncate">{mediaUrl}</p>
                        </div>
                        <span className="text-cyan-400">→</span>
                      </div>
                    </a>
                  )
                }

                // Use appropriate heights for different embed types
                const embedHeight = mediaType === MediaProvider.BANDCAMP ? '470px' :
                                   mediaType === MediaProvider.SPOTIFY ? '352px' :
                                   mediaType === MediaProvider.SOUNDCLOUD ? '166px' :
                                   mediaType === MediaProvider.INSTAGRAM ? '480px' :
                                   mediaType === MediaProvider.TIKTOK ? '575px' :
                                   mediaType === MediaProvider.X ? '400px' : '315px'
                return (
                  <div className="relative w-full bg-neutral-900" style={{ minHeight: embedHeight }}>
                    <iframe
                      className="w-full"
                      style={{ height: embedHeight }}
                      src={mediaUrl}
                      title="Media"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                )
              })()
            )
          )}

          {/* Repost preview */}
          {post.repostId && (
            <div className="p-3">
              <RepostPreview postId={post.repostId} handleOnPlayClicked={handleOnPlayClicked} />
            </div>
          )}

          {/* Track player */}
          {post.track && !post.track.deleted && (
            <div className="p-3">
              <MiniAudioPlayer
                song={{
                  src: post.track.playbackUrl,
                  trackId: post.track.id,
                  art: post.track.artworkUrl,
                  title: post.track.title,
                  artist: post.track.artist,
                  isFavorite: post.track.isFavorite,
                  playbackCount: post.track.playbackCountFormatted,
                  favoriteCount: post.track.favoriteCount,
                  saleType: post.track.saleType,
                  price: post.track.price,
                }}
                handleOnPlayClicked={() => handleOnPlayClicked((post.track as Track).id)}
              />
            </div>
          )}
          {post.track && post.track.deleted && (
            <div className="p-3">
              <NotAvailableMessage type="track" />
            </div>
          )}
        </div>
      )}

      {/* Stats & Actions - Instagram style */}
      <div className="px-4 py-2">
        <PostStats
          totalReactions={post.totalReactions}
          topReactions={post.topReactions}
          commentCount={post.commentCount}
          repostCount={post.repostCount}
          postId={post.id}
        />
      </div>
      <div className="px-2 pb-2">
        <PostActions
          postId={post.id}
          myReaction={post.myReaction}
          isBookmarked={post.isBookmarked}
          isEphemeral={isEphemeral}
          isOwner={isAuthor}
          postData={isEphemeral ? {
            id: post.id,
            body: post.body,
            createdAt: post.createdAt,
            uploadedMediaUrl,
            uploadedMediaType,
            totalReactions: post.totalReactions,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            profile: post.profile ? {
              id: post.profile.id,
              displayName: post.profile.displayName,
              userHandle: post.profile.userHandle,
            } : null,
          } : undefined}
        />
      </div>
    </article>
  )
}

export const Post = memo(PostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.myReaction === next.post?.myReaction &&
         prev.post?.totalReactions === next.post?.totalReactions &&
         prev.post?.isBookmarked === next.post?.isBookmarked
})
