import classNames from 'classnames';
import { Post } from 'components/Post';
import { SortOrder, SortPostField, usePostsQuery } from 'lib/graphql';
import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';
import { PostSkeleton } from './PostSkeleton';

interface PostsProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
}

const pageSize = 10;

export const Posts = ({ className, profileId }: PostsProps) => {
  const { data, loading, refetch, fetchMore } = usePostsQuery({
    variables: {
      filter: profileId ? { profileId } : undefined,
      page: { first: pageSize },
      sort: { field: SortPostField.CreatedAt, order: SortOrder.Desc },
    },
    ssr: false,
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

  const { nodes, pageInfo } = data.posts;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    });
  };

  return (
    <PullToRefresh onRefresh={refetch} className="h-auto">
      <div className={classNames('space-y-2', className)}>
        {nodes.map(post => (
          <Post key={post.id} post={post} />
        ))}
        {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Posts" />}
      </div>
    </PullToRefresh>
  );
};
