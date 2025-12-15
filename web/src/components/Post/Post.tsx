import { memo } from 'react'
import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { PostQuery, Role, Track } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks'

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

  const hasMedia = post.mediaLink || post.track || post.repostId

  return (
    <article className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors">
      {/* Header - Instagram style compact */}
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
        {canEdit && (
          <button
            aria-label="More options"
            className="p-2 -mr-1 rounded-full hover:bg-neutral-800 transition-colors"
            onClick={onEllipsisClick}
          >
            <Ellipsis className="h-4 w-4 text-neutral-400" />
          </button>
        )}
      </header>

      {/* Body text - compact with animated emotes */}
      {post.body && (
        <div className="px-3 pb-2">
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
          {/* Embedded video/link - Legacy UI style: simple, reliable rendering */}
          {post.mediaLink && (
            hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
              <ReactPlayer
                width="100%"
                height="400px"
                url={post.mediaLink}
                playsinline
                controls
                light
                pip
                config={{
                  youtube: { playerVars: { modestbranding: 1, rel: 0, playsinline: 1 } },
                  vimeo: { playerOptions: { responsive: true, playsinline: true } },
                }}
              />
            ) : (
              // Simple iframe embed for Spotify, SoundCloud, Bandcamp - like legacy UI
              <iframe
                className="w-full min-h-[300px] bg-neutral-900"
                src={post.mediaLink}
                title="Media"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
              />
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

      {/* Stats & Actions - Instagram style bottom section */}
      <div className="px-3 py-2 border-t border-neutral-800">
        <PostStats
          totalReactions={post.totalReactions}
          topReactions={post.topReactions}
          commentCount={post.commentCount}
          repostCount={post.repostCount}
          postId={post.id}
        />
      </div>
      <div className="border-t border-neutral-800">
        <PostActions postId={post.id} myReaction={post.myReaction} />
      </div>
    </article>
  )
}

export const Post = memo(PostComponent, (prev, next) => {
  return prev.post?.id === next.post?.id &&
         prev.post?.myReaction === next.post?.myReaction &&
         prev.post?.totalReactions === next.post?.totalReactions
})
