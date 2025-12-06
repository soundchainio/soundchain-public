import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { PostQuery, Role, Track } from 'lib/graphql'
import Link from 'next/link'
import ReactPlayer from 'react-player'
import { LinkItUrl } from 'react-linkify-it'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { MediaProvider } from 'types/MediaProvider'
import { hasLazyLoadWithThumbnailSupport, IdentifySource } from 'utils/NormalizeEmbedLinks'

import { Avatar } from '../Avatar'
import { DisplayName } from '../DisplayName'
import { MiniAudioPlayer } from '../MiniAudioPlayer'
import { NotAvailableMessage } from '../NotAvailableMessage'
import { Timestamp } from '../Timestamp'
import { PostActions } from './PostActions'
import { PostSkeleton } from './PostSkeleton'
import { PostStats } from './PostStats'
import { RepostPreview } from './RepostPreview'

interface PostProps {
  post: PostQuery['post']
  handleOnPlayClicked: (trackId: string) => void
}

export const Post = ({ post, handleOnPlayClicked }: PostProps) => {
  const me = useMe()
  const { dispatchShowAuthorActionsModal } = useModalDispatch()

  if (!post) return <PostSkeleton />

  const isAuthor = post?.profile.id == me?.profile.id
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

  return (
    <div>
      <div className="break-words bg-gray-20 p-4">
        <div className="flex items-center">
          <Avatar profile={post.profile} pixels={34} className="flex items-center justify-center" />
          <div className="ml-2 flex min-w-0 flex-1 items-center justify-between">
            <div className="flex min-w-0 flex-col">
              <Link href={`/profiles/${post.profile.userHandle}`} passHref>
                <DisplayName
                  name={post.profile.displayName}
                  verified={post.profile.verified}
                  teamMember={post.profile.teamMember}
                  badges={post.profile.badges}
                />
              </Link>
              <Link href={`/posts/${post.id}`} className="leading-4" style={{ width: 'fit-content' }} passHref>
                <Timestamp
                  datetime={post.createdAt}
                  edited={post.createdAt !== post.updatedAt || false}
                  className="flex-1 text-left"
                  small
                />
              </Link>
            </div>
            {canEdit && (
              <button aria-label="More options" className="h-7 w-14 flex-shrink-0" onClick={onEllipsisClick}>
                <Ellipsis className="h-3 w-full pr-4 pl-4" />
              </button>
            )}
          </div>
        </div>
        <LinkItUrl className="underline text-blue-400">
          <pre className="mt-4 whitespace-pre-wrap break-words text-gray-100">{post.body}</pre>
        </LinkItUrl>
        {post.mediaLink && (() => {
          const mediaSource = IdentifySource(post.mediaLink)
          const mediaType = mediaSource.type

          // Enhanced URL with autoplay and no restrictions
          let enhancedUrl = post.mediaLink

          // Platform-specific enhancements
          if (mediaType === MediaProvider.YOUTUBE) {
            const url = new URL(enhancedUrl)
            url.searchParams.set('iv_load_policy', '3') // Remove age restrictions
            url.searchParams.set('modestbranding', '1')
            url.searchParams.set('rel', '0')
            enhancedUrl = url.toString()

            // Return responsive YouTube embed - use fixed height on mobile to reduce letterboxing
            return (
              <div className="mt-4 w-full bg-black rounded-lg overflow-hidden">
                <iframe
                  frameBorder="0"
                  className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
                  allowFullScreen
                  src={enhancedUrl}
                  title="Media"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                />
              </div>
            )
          }

          if (mediaType === MediaProvider.VIMEO) {
            const url = new URL(enhancedUrl)
            url.searchParams.set('autopause', '0')
            enhancedUrl = url.toString()

            // Return responsive Vimeo embed - fixed height on mobile to reduce letterboxing
            return (
              <div className="mt-4 w-full bg-black rounded-lg overflow-hidden">
                <iframe
                  frameBorder="0"
                  className="w-full h-[280px] sm:h-[350px] md:aspect-video md:h-auto"
                  allowFullScreen
                  src={enhancedUrl}
                  title="Media"
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              </div>
            )
          }

          // Platform-specific iframe rendering
          if (mediaType === MediaProvider.INSTAGRAM) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[700px] md:h-[700px]"
                allowFullScreen
                scrolling="no"
                src={enhancedUrl}
                title="Media"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            )
          }

          if (mediaType === MediaProvider.TIKTOK) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[650px] md:h-[650px]"
                allowFullScreen
                scrolling="no"
                src={enhancedUrl}
                title="Media"
                allow="autoplay; encrypted-media; accelerometer; gyroscope"
              />
            )
          }

          if (mediaType === MediaProvider.X) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 h-[70vh] max-h-[700px] md:h-[700px]"
                allowFullScreen
                scrolling="no"
                src={enhancedUrl}
                title="Media"
              />
            )
          }

          if (mediaType === MediaProvider.BANDCAMP) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 h-[80vh] max-h-[700px] md:h-[600px]"
                allowFullScreen
                seamless
                src={enhancedUrl}
                title="Media"
              />
            )
          }

          if (mediaType === MediaProvider.TWITCH) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 aspect-video"
                allowFullScreen
                src={enhancedUrl}
                title="Media"
                allow="autoplay; fullscreen; picture-in-picture"
              />
            )
          }

          if (mediaType === MediaProvider.DISCORD) {
            return (
              <iframe
                frameBorder="0"
                className="mt-4 w-full bg-gray-20 h-[500px] md:h-[600px]"
                src={enhancedUrl}
                title="Media"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              />
            )
          }

          // Default iframe for SoundCloud, Spotify, Custom HTML
          return (
            <iframe
              frameBorder="0"
              className="mt-4 w-full bg-gray-20 aspect-video"
              allowFullScreen
              src={enhancedUrl}
              title="Media"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          )
        })()}
        {post.repostId && <RepostPreview postId={post.repostId} handleOnPlayClicked={handleOnPlayClicked} />}
        {post.track && !post.track.deleted && (
          <div className="mt-4 w-full">
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
        {post.track && post.track.deleted && <NotAvailableMessage type="track" />}
        <PostStats
          totalReactions={post.totalReactions}
          topReactions={post.topReactions}
          commentCount={post.commentCount}
          repostCount={post.repostCount}
          postId={post.id}
        />
      </div>
      <PostActions postId={post.id} myReaction={post.myReaction} />
    </div>
  )
}
