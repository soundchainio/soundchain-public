import classNames from 'classnames';
import { Post } from 'components/Post';
import { usePostsQuery } from 'lib/graphql';
import React from 'react';
import { PostSkeleton } from './PostSkeleton';

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
}

export const Posts = ({ className, profileId }: PostsProps) => {
  const { data } = usePostsQuery({ variables: { filter: profileId ? { profileId } : undefined } });

  if (!data) {
    return <PostSkeleton />;
  }

  return (
    <div className={classNames('space-y-3', className)}>
      {data.posts.nodes.map(({ id }) => (
        <Post key={id} postId={id} />
      ))}
    </div>
  );
};
