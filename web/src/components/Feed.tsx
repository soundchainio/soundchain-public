import { Post } from 'components/Post';
import { useFeedQuery } from 'lib/graphql';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { InfiniteLoader } from './InfiniteLoader';
import { NoResultFound } from './NoResultFound';
import { PostSkeleton } from './PostSkeleton';

interface FeedProps {
  pageSize?: number;
}

export const Feed = ({ pageSize }: FeedProps) => {
  pageSize = pageSize ?? 10;
  const { data, loading, fetchMore, refetch } = useFeedQuery({ variables: { page: { first: pageSize } }, ssr: false });
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

  const { nodes, pageInfo } = data.feed;

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

  const onRefresh = async () => {
    await refetch();
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="space-y-2">
        {nodes.map(feedItem => (
          <Post key={feedItem.post.id} post={feedItem.post} />
        ))}
        {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Posts" />}
      </div>
    </PullToRefresh>
  );
};
