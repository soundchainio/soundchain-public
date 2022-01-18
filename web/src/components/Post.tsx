import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Ellipsis } from 'icons/Ellipsis';
import { PostQuery, Role } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { AddLinks } from 'react-link-text';
import ReactPlayer from 'react-player';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { hasLazyLoadWithThumbnailSupport } from 'utils/NormalizeEmbedLinks';
import { Avatar } from './Avatar';
import { DisplayName } from './DisplayName';
import { MiniAudioPlayer } from './MiniAudioPlayer';
import { NotAvailableMessage } from './NotAvailableMessage';
import { PostActions } from './PostActions';
import { PostSkeleton } from './PostSkeleton';
import { PostStats } from './PostStats';
import { RepostPreview } from './RepostPreview';
import { Timestamp } from './Timestamp';

interface PostProps {
  post: PostQuery['post'];
}

export const Post = ({ post }: PostProps) => {
  const me = useMe();
  const { dispatchShowAuthorActionsModal } = useModalDispatch();

  if (!post) return <PostSkeleton />;

  const isAuthor = post?.profile.id == me?.profile.id;
  const canEdit = isAuthor || me?.roles?.includes(Role.Admin) || me?.roles?.includes(Role.TeamMember);

  const addLinksOptions = {
    className: 'underline text-blue-400',
  };

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal(true, AuthorActionsType.POST, post.id, !isAuthor);
  };

  if (post?.deleted) {
    return <NotAvailableMessage type="post" />;
  }

  return (
    <div>
      <div className="p-4 bg-gray-20 break-words">
        <div className="flex items-center">
          <Avatar profile={post.profile} pixels={34} className="flex items-center justify-center" />
          <div className="flex items-center ml-2 flex-1 justify-between min-w-0">
            <div className="flex flex-col min-w-0">
              <NextLink href={`/profiles/${post.profile.userHandle}`}>
                <a>
                  <DisplayName
                    name={post.profile.displayName}
                    verified={post.profile.verified}
                    teamMember={post.profile.teamMember}
                  />
                </a>
              </NextLink>
              <Timestamp
                datetime={post.createdAt}
                edited={post.createdAt !== post.updatedAt || false}
                className="flex-1 text-left"
                small
              />
            </div>
            <div className="w-14 flex-shrink-0">
              {canEdit && <Ellipsis className="pr-4 pl-4 w-full h-3 cursor-pointer" onClick={onEllipsisClick} />}
            </div>
          </div>
        </div>
        <AddLinks options={addLinksOptions}>
          <pre className="mt-4 text-gray-100 break-words whitespace-pre-wrap">{post.body}</pre>
        </AddLinks>
        {post.mediaLink &&
          (hasLazyLoadWithThumbnailSupport(post.mediaLink) ? (
            <ReactPlayer
              width="100%"
              height="150px"
              style={{ marginTop: '1rem' }}
              url={post.mediaLink}
              playsinline
              controls
              light
            />
          ) : (
            <iframe
              frameBorder="0"
              className="mt-4 w-full bg-gray-20"
              allowFullScreen
              src={post.mediaLink}
              title="Media"
            />
          ))}
        {post.repostId && <RepostPreview postId={post.repostId} />}
        {post.track && !post.track.deleted && (
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
          />
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
  );
};
