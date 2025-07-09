import { useModalDispatch } from 'contexts/providers/modal'
import { useMe } from 'hooks/useMe'
import { Ellipsis } from 'icons/Ellipsis'
import { PostQuery, Role, Track } from 'lib/graphql'
import Link from 'next/link'
import { AddLinks } from 'react-link-text' // Removed AddLinksProps import
import ReactPlayer from 'react-player'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks'

// Define a minimal type for addLinksOptions based on react-link-text usage
interface AddLinksOptions {
  className?: string;
}

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

  const addLinksOptions: AddLinksOptions = {
    className: 'underline text-blue-400',
  }

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal(true, AuthorActionsType.POST, post.id, !isAuthor)
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
        <AddLinks options={addLinksOptions} {...{ children: <pre className="mt-4 whitespace-pre-wrap break-words text-gray-100">{post.body}</pre> } as any} />
        {post.mediaLink &&
          (hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
            <ReactPlayer
              width="100%"
              height="600px"
              style={{ marginTop: '1rem' }}
              url={post.mediaLink}
              playsinline
              controls
              light
            />
          ) : (
            <iframe
              frameBorder="0"
              className="mt-4 min-h-[250px] w-full bg-gray-20"
              allowFullScreen
              src={post.mediaLink}
              title="Media"
            />
          ))}
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
