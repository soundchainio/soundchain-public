import classNames from 'classnames';
import { Post } from 'components/Post';
import { SortOrder, SortPostField, usePostsQuery } from 'lib/graphql';
import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { NoResultFound } from './NoResultFound';
import { PostSkeleton } from './PostSkeleton';

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
}

export const Posts = ({ className, profileId }: PostsProps) => {
  const { data, loading, refetch } = usePostsQuery({
    variables: {
      filter: profileId ? { profileId } : undefined,
      sort: { field: SortPostField.CreatedAt, order: SortOrder.Desc },
    },
  });

  if (loading) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (!data) {
    return <NoResultFound type="posts" />;
  }

  return (
    <PullToRefresh onRefresh={refetch} className="h-auto">
      <div className={classNames('space-y-2', className)}>
        {data.posts.nodes.map(post => (
          <Post key={post.id} post={post} />
        ))}
      </div>
    </PullToRefresh>
  );
};
