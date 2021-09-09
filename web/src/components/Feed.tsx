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
      <>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </>
    );
  }

  const { nodes, pageInfo } = data.feed;
  const postIds = nodes.map(node => node.post.id);

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
    <div className="space-y-3">
      {postIds.map(id => (
        <Post key={id} postId={id} />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Posts" />}
    </div>
  );
};
