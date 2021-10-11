import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Ellipsis } from 'icons/Ellipsis';
import { usePostQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { AudioPlayer } from './AudioPlayer';
import { Avatar } from './Avatar';
import { PostActions } from './PostActions';
import { PostSkeleton } from './PostSkeleton';
import { PostStats } from './PostStats';
import { RepostPreview } from './RepostPreview';
import { Timestamp } from './Timestamp';

interface PostProps {
  postId: string;
}

export const Post = ({ postId }: PostProps) => {
  const { data } = usePostQuery({ variables: { id: postId } });
  const post = data?.post;
  const me = useMe();
  const { dispatchShowAuthorActionsModal } = useModalDispatch();

  if (!post) return <PostSkeleton />;

  const canEdit = post?.profile.id == me?.profile.id;

  const onEllipsisClick = () => {
    dispatchShowAuthorActionsModal(true, AuthorActionsType.POST, post.id);
  };

  return (
    <div>
      <div className="p-4 bg-gray-20 break-words">
        <div className="flex items-center">
          <Avatar profile={post.profile} />
          <div className="flex items-center w-full ml-4">
            <div className="flex flex-1 flex-col">
              <NextLink href={`/profiles/${post.profile.id}`}>
                <a className="text-lg font-bold text-gray-100">{post.profile.displayName}</a>
              </NextLink>
              <Timestamp
                datetime={post.createdAt}
                edited={post.createdAt !== post.updatedAt || false}
                className="flex-1 text-left"
              />
            </div>
            <div className="w-14">
              {canEdit && <Ellipsis className="pr-4 pl-4 w-full h-3 cursor-pointer" onClick={onEllipsisClick} />}
            </div>
          </div>
        </div>
        <pre className="mt-4 text-gray-100 break-words whitespace-pre-wrap">{post.body}</pre>
        {post.mediaLink && (
          <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={post.mediaLink} />
        )}
        {post.repostId && <RepostPreview postId={post.repostId} />}
        {post.track && (
          <AudioPlayer
            trackId={post.track.id}
            art={post.track.artworkUrl}
            src={post.track.playbackUrl}
            title={post.track.title}
          />
        )}
        <PostStats
          totalReactions={post.totalReactions}
          topReactions={post.topReactions}
          commentCount={post.commentCount}
          repostCount={post.repostCount}
          postId={postId}
        />
      </div>
      <PostActions postId={postId} myReaction={post.myReaction} />
    </div>
  );
};
