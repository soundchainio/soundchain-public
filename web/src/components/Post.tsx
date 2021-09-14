import { useModalDispatch } from 'contexts/providers/modal';
import { useMe } from 'hooks/useMe';
import { Ellipsis } from 'icons/Ellipsis';
import { usePostQuery } from 'lib/graphql';
import NextLink from 'next/link';
import React from 'react';
import { DeleteModalType } from 'types/DeleteModalType';
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
  const { dispatchShowDeleteModal } = useModalDispatch();
  const me = useMe();

  const post = data?.post;
  const canEdit = post?.profile.id == me?.profile.id;

  const onEllipsisClick = () => {
    dispatchShowDeleteModal(true, DeleteModalType.POST, postId);
  };

  if (!post) return <PostSkeleton />;

  return (
    <div>
      <NextLink href={`/posts/${post.id}`}>
        <div className="p-4 bg-gray-20 break-words">
          <div className="flex items-center">
            <Avatar profile={post.profile} />
            <div className="flex flex-col ml-4">
              <NextLink href={`/profiles/${post.profile.id}`}>
                <a className="text-lg font-bold text-gray-100">{post.profile.displayName}</a>
              </NextLink>
              <Timestamp datetime={post.createdAt} className="flex-1 text-left" />
            </div>
            {canEdit && (
              <div>
                <Ellipsis className="pr-2 pl-2 w-10 h-3 cursor-pointer" onClick={onEllipsisClick} />
              </div>
            )}
          </div>
          <pre className="mt-4 text-gray-100 break-words whitespace-pre-wrap">{post.body}</pre>
          {post.mediaLink && (
            <iframe frameBorder="0" className="mt-4 w-full bg-gray-20" allowFullScreen src={post.mediaLink} />
          )}
          {post.repostId && <RepostPreview postId={post.repostId} />}
          <PostStats
            totalReactions={post.totalReactions}
            topReactions={post.topReactions}
            commentCount={post.commentCount}
            repostCount={post.repostCount}
            postId={postId}
          />
        </div>
      </NextLink>
      <PostActions postId={postId} myReaction={post.myReaction} />
    </div>
  );
};
function dispatchShowDeleteModal(arg0: boolean, COMMENT: any, commentId: any) {
  throw new Error('Function not implemented.');
}
