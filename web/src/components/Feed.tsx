import { Post } from 'components/Post';
import { useFeedQuery } from 'lib/graphql';
import { InfiniteLoader } from './InfiniteLoader';
import { PostSkeleton } from './PostSkeleton';

interface FeedProps {
  pageSize?: number;
}

export const Feed = ({ pageSize }: FeedProps) => {
  pageSize = pageSize ?? 10;
  const { data, fetchMore } = useFeedQuery({ variables: { page: { first: pageSize } } });
  if (!data) {
    return (
      <div className="space-y-2">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
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

  return (
    <div className="space-y-2">
      {nodes.map(feedItem => (
        <Post key={feedItem.post.id} post={feedItem.post} />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Posts" />}
    </div>
  );
};
