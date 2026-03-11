import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { PostQuery, Role, Track, useCommentsLazyQuery, PageInput } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { Clock, Lock, MessageCircle, ExternalLink } from 'lucide-react'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'
import { MediaProvider } from 'types/MediaProvider'
import { MakePostPermanentModal } from '../modals/MakePostPermanentModal'
import { Comment } from '../Comment/Comment'
import { CommentSkeleton } from '../Comment/CommentSkeleton'
import { NewCommentForm } from '../NewCommentForm'

// Helper to extract YouTube video ID and generate thumbnail URL
const getYouTubeThumbnail = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
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
import { PostSkeleton } from './PostSkeleton'
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
  const [showPermanentModal, setShowPermanentModal] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const [showComments, setShowComments] = useState(false)
  const [pipedStreamUrl, setPipedStreamUrl] = useState<string | null>(null)
  const [ytBlocked, setYtBlocked] = useState(false)
  const ytPlayerReady = useRef(false)
  const ytBlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect YouTube age-restricted/blocked embeds via timeout.
  // YouTube's IFrame API never initializes for age-gated content,
  // so onReady never fires → timeout triggers → show fallback.
  const isYouTube = !!post?.mediaLink?.match(/youtube|youtu\.be|youtube-nocookie/)
  const startYtBlockCheck = useCallback(() => {
    if (!isYouTube || ytPlayerReady.current || ytBlocked) return
    if (ytBlockTimer.current) clearTimeout(ytBlockTimer.current)
    ytBlockTimer.current = setTimeout(() => {
      if (!ytPlayerReady.current) {
        setYtBlocked(true)
        // Try proxy for inline playback
        const vidMatch = post?.mediaLink?.match(/(?:embed\/|watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
        if (vidMatch?.[1]) {
          fetch(`/api/youtube/stream?v=${vidMatch[1]}`)
            .then(r => r.json())
            .then(data => { if (data.videoUrl) setPipedStreamUrl(data.videoUrl) })
            .catch(() => {})
        }
      }
    }, 5000)
  }, [isYouTube, ytBlocked, post?.mediaLink])

  // On mobile (no light mode), start timeout immediately on mount
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isYouTube && isMobile) startYtBlockCheck()
    return () => { if (ytBlockTimer.current) clearTimeout(ytBlockTimer.current) }
  }, [isYouTube, startYtBlockCheck])

  const firstPage: PageInput = { first: 5 }
  const [loadComments, { data: commentsData, loading: commentsLoading }] = useCommentsLazyQuery({
    variables: { postId: post?.id || '', page: firstPage },
    fetchPolicy: 'cache-and-network',
  })

  // Load comments on demand — prevents N+1 query flood on feed scroll
  const handleShowComments = useCallback(() => {
    if (!showComments && post?.id) {
      setShowComments(true)
      loadComments({ variables: { postId: post.id, page: firstPage } })
    } else {
      setShowComments(!showComments)
    }
  }, [showComments, post?.id, loadComments])

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
    <article className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Header */}
      <header className="flex items-center justify-between">
        {isGuest ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <GuestAvatar walletAddress={post.walletAddress!} pixels={32} />
            <span className="text-sm font-semibold text-neutral-100">
              {formatWalletAddress(post.walletAddress!)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 rounded-full font-medium">
              Guest
            </span>
            <Timestamp
              datetime={post.createdAt}
              edited={post.createdAt !== post.updatedAt || false}
              className="text-xs text-gray-500"
              small
            />
          </div>
        ) : hasProfile ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <Link href={`/dex/users/${post.profile!.userHandle}`} className="flex-shrink-0">
              <Avatar profile={post.profile!} pixels={32} />
            </Link>
            <Link href={`/dex/users/${post.profile!.userHandle}`} className="flex items-center gap-2 min-w-0 flex-wrap">
              <DisplayName
                name={post.profile!.displayName || ''}
                verified={post.profile!.verified}
                teamMember={post.profile!.teamMember}
                badges={post.profile!.badges}
                className="text-sm font-semibold"
              />
              {post.profile!.userHandle && (
                <span className="text-gray-500 text-xs">@{post.profile!.userHandle}</span>
              )}
            </Link>
            <Timestamp
              datetime={post.createdAt}
              edited={post.createdAt !== post.updatedAt || false}
              className="text-xs text-gray-500"
              small
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
              <span className="text-neutral-400 text-xs">?</span>
            </div>
            <span className="text-sm text-neutral-400">Unknown user</span>
            <Timestamp
              datetime={post.createdAt}
              edited={post.createdAt !== post.updatedAt || false}
              className="text-xs text-gray-500"
              small
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Ephemeral time remaining badge - clickable for owner to make permanent */}
          {isEphemeral && !isExpired && (
            isAuthor ? (
              <button
                onClick={() => setShowPermanentModal(true)}
                className="flex items-center gap-1 px-2 py-1 bg-amber-500/90 hover:bg-amber-400 rounded-full text-xs font-medium text-black transition-colors group"
                title="Click to make permanent"
              >
                <Clock className="w-3 h-3 group-hover:hidden" />
                <Lock className="w-3 h-3 hidden group-hover:block" />
                <span>{getTimeRemaining()}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/90 rounded-full text-xs font-medium text-black">
                <Clock className="w-3 h-3" />
                <span>{getTimeRemaining()}</span>
              </div>
            )
          )}
          {/* Only show menu for authors/admins - not on other people's posts */}
          {canEdit && (
            <button
              aria-label="More options"
              className="p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
              onClick={onEllipsisClick}
            >
              <Ellipsis className="h-5 w-5 text-neutral-400" />
            </button>
          )}
        </div>
      </header>

      {/* Body text */}
      {post.body && (
        <div className="mt-1">
          <PostBodyWithEmotes
            body={post.body}
            className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed"
            linkify
          />
        </div>
      )}

      {/* Media Section */}
      {hasMedia && (
        <div className="mt-2 rounded-xl overflow-hidden relative">
          {/* Uploaded ephemeral media (24h stories) */}
          {hasUploadedMedia && !isExpired && (
            <div className="relative">
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
            <div className="p-8 flex flex-col items-center justify-center text-neutral-500 bg-neutral-800">
              <Clock className="w-8 h-8 mb-2" />
              <span className="text-sm">Media expired</span>
            </div>
          )}

          {/* Embedded video/link - Responsive with proper aspect ratio */}
          {/* Key is stable to prevent remounting on orientation change */}
          {/* CSS contain/will-change/transform prevents iframe reload on mobile rotation */}
          {post.mediaLink && (() => {
            const mediaUrl = post.mediaLink?.replace(/^http:/, 'https:') || ''
            // Playlists need iframe to show tracklist - ReactPlayer doesn't support playlists
            const isPlaylist = mediaUrl.includes('listType=playlist') || mediaUrl.includes('videoseries') || mediaUrl.includes('list=')
            const useReactPlayer = !isPlaylist && hasLazyLoadWithThumbnailSupport(post.mediaLink)

            return useReactPlayer ? (
              // YouTube videos, Vimeo, Facebook - use ReactPlayer with 16:9 aspect ratio
              <div key={`player-${post.id}`} className="relative w-full orientation-stable">
                {!ytBlocked ? (
                  <div
                    className="relative w-full"
                    style={{
                      paddingTop: '56.25%',
                      contain: 'layout style',
                      willChange: 'contents',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <ReactPlayer
                      width="100%"
                      height="100%"
                      style={{ position: 'absolute', top: 0, left: 0 }}
                      url={post.mediaLink}
                      playsinline
                      controls
                      light={typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? false : (getYouTubeThumbnail(post.mediaLink) || true)}
                      pip
                      playing={false}
                      stopOnUnmount={false}
                      onReady={() => { ytPlayerReady.current = true }}
                      onClickPreview={() => { startYtBlockCheck() }}
                      onError={() => {
                        setYtBlocked(true)
                        const vm = post.mediaLink?.match(/(?:embed\/|watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
                        if (vm?.[1]) {
                          fetch(`/api/youtube/stream?v=${vm[1]}`)
                            .then(r => r.json())
                            .then(data => { if (data.videoUrl) setPipedStreamUrl(data.videoUrl) })
                            .catch(() => {})
                        }
                      }}
                      config={{
                        youtube: {
                          playerVars: { modestbranding: 1, rel: 0, playsinline: 1, origin: typeof window !== 'undefined' ? window.location.origin : '' },
                          embedOptions: { host: 'https://www.youtube-nocookie.com' },
                        },
                        vimeo: { playerOptions: { responsive: true, playsinline: true } },
                        facebook: { appId: '' },
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full bg-neutral-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {pipedStreamUrl ? (
                      <video
                        className="w-full h-full object-contain bg-black"
                        controls
                        playsInline
                        src={pipedStreamUrl}
                      />
                    ) : (
                      <a
                        href={post.mediaLink?.replace('youtube-nocookie.com/embed/', 'youtube.com/watch?v=').replace(/[?&]autoplay=1/, '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-full h-full flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors"
                      >
                        {getYouTubeThumbnail(post.mediaLink) && (
                          <img src={getYouTubeThumbnail(post.mediaLink)!} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                        )}
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <ExternalLink className="w-8 h-8 text-cyan-400" />
                          <span className="text-white font-medium text-sm">Watch on YouTube</span>
                          <span className="text-white/50 text-xs">Age-restricted — tap to open</span>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // All other platforms (audio, social, playlists) - use iframe embed
              (() => {
                const mediaType = IdentifySource(post.mediaLink).type

                // Platform-specific embed heights
                // YouTube playlists need more height to show tracklist
                const getEmbedHeight = () => {
                  if (isPlaylist) return '500px'  // Taller for playlist tracklist
                  switch (mediaType) {
                    // Audio platforms (optimized)
                    case MediaProvider.BANDCAMP: return '470px'
                    case MediaProvider.SPOTIFY: return '352px'
                    case MediaProvider.SOUNDCLOUD: return '166px'
                    // Social platforms (new - optimized for each)
                    case MediaProvider.INSTAGRAM: return '540px'
                    case MediaProvider.TIKTOK: return '740px'
                    case MediaProvider.X: return '400px'
                    case MediaProvider.TWITCH: return '378px'
                    case MediaProvider.DISCORD: return '400px'
                    case MediaProvider.CUSTOM_HTML: return '400px'
                    default: return '250px'
                  }
                }
                const embedHeight = getEmbedHeight()

                return (
                  <div
                    key={`iframe-wrapper-${post.id}`}
                    className="orientation-stable"
                    style={{
                      contain: 'layout style',
                      willChange: 'contents',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <iframe
                      key={`iframe-${post.id}`}
                      frameBorder="0"
                      className="w-full bg-black"
                      style={{ minHeight: embedHeight }}
                      src={mediaUrl}
                      title="Media"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )
              })()
            )
          })()}

          {/* Repost preview */}
          {post.repostId && (
            <div className="px-3 py-2">
              <RepostPreview postId={post.repostId} handleOnPlayClicked={handleOnPlayClicked} />
            </div>
          )}

          {/* Track player */}
          {post.track && !post.track.deleted && (
            <div className="px-3 py-2">
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
            <div className="px-3 py-2">
              <NotAvailableMessage type="track" />
            </div>
          )}
        </div>
      )}

      {/* Comment count — tap to load/toggle threaded replies */}
      {(post.commentCount ?? 0) > 0 && !showComments && (
        <button
          onClick={handleShowComments}
          className="mt-2 ml-2 pl-3 text-xs text-neutral-400 hover:text-cyan-400 transition-colors"
        >
          View {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </button>
      )}

      {/* Threaded replies — loaded on demand */}
      {showComments && commentsLoading ? (
        <div className="mt-3 ml-2 pl-3 border-l-2 border-white/10 space-y-2">
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      ) : showComments && commentsData?.comments?.nodes?.length ? (
        <div className="mt-3 ml-2 pl-3 border-l-2 border-white/10 space-y-2">
          {commentsData.comments.nodes.map((comment: any) => (
            <Comment
              key={comment.id}
              commentId={comment.id}
              onReplyClick={() => {
                commentInputRef.current?.focus()
                commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }}
            />
          ))}
          {(post.commentCount ?? 0) > (commentsData.comments.nodes.length ?? 0) && (
            <button className="text-xs text-neutral-500 hover:text-cyan-400 transition-colors py-1">
              View more comments
            </button>
          )}
        </div>
      ) : null}

      {/* Reply input — cyan thread line */}
      <div className="mt-3 ml-2 pl-3 border-l-2 border-cyan-500/30">
        <NewCommentForm
          postId={post.id}
          compact
          onSuccess={() => {
            // Show comments thread after posting a new comment
            if (!showComments) setShowComments(true)
            loadComments({ variables: { postId: post.id, page: firstPage } })
          }}
          inputRef={commentInputRef}
          myReaction={post.myReaction}
          isBookmarked={post.isBookmarked}
          hasTrack={!!post.track}
          postData={{
            id: post.id,
            body: post.body,
            createdAt: post.createdAt,
            uploadedMediaUrl,
            uploadedMediaType,
            mediaLink: post.mediaLink,
            mediaThumbnail: post.mediaThumbnail,
            totalReactions: post.totalReactions,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            profile: post.profile ? {
              id: post.profile.id,
              displayName: post.profile.displayName,
              userHandle: post.profile.userHandle,
            } : null,
          }}
        />
      </div>

      {/* Make Permanent Modal */}
      {showPermanentModal && (
        <MakePostPermanentModal
          isOpen={showPermanentModal}
          onClose={() => setShowPermanentModal(false)}
          postId={post.id}
          mediaSize={(postWithMedia as any).mediaSize || 0}
          onSuccess={() => setShowPermanentModal(false)}
        />
      )}
    </article>
  )
}

export const Post = memo(PostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.myReaction === next.post?.myReaction &&
         prev.post?.totalReactions === next.post?.totalReactions &&
         prev.post?.isBookmarked === next.post?.isBookmarked &&
         prev.post?.commentCount === next.post?.commentCount
})

