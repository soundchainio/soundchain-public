import classNames from 'classnames';
import { Post } from 'components/Post';
import { PostsQueryVariables, usePostsQuery } from 'lib/graphql';
import React from 'react';
import { PostSkeleton } from './PostSkeleton';

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  variables?: PostsQueryVariables;
}

export const Posts = ({ className, variables }: PostsProps) => {
  const { data } = usePostsQuery({ variables });

  if (!data) {
    return <PostSkeleton />;
  }

  return (
    <div className={classNames('space-y-3', className)}>
      {data.posts.map((post, index) => (
        <Post key={index} postId={post.id} />
      ))}
    </div>
  );
};
