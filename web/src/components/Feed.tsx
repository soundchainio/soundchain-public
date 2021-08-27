import { Post } from 'components/Post';
import { useFeedQuery } from 'lib/graphql';
import { Button } from './Button';
import { PostSkeleton } from './PostSkeleton';

export const Feed = () => {
  const { data, fetchMore } = useFeedQuery({ variables: { page: { first: 5 } } });

  if (!data) {
    return <PostSkeleton />;
  }
  console.log(data.feed.pageInfo.endCursor);

  return (
    <div className="space-y-3">
      {data.feed.nodes
        .map(node => node.post)
        .map(({ id }) => (
          <Post key={id} postId={id} />
        ))}
      {data.feed.pageInfo.hasNextPage && (
        <Button
          variant="green-gradient"
          onClick={() =>
            fetchMore({
              variables: {
                page: {
                  first: 5,
                  after: data.feed.pageInfo.endCursor,
                },
              },
            })
          }
        >
          load more
        </Button>
      )}
    </div>
  );
};
