import { useCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';
import { CommentSkeleton } from './CommentSkeleton';
import { InfiniteLoader } from './InfiniteLoader';

interface CommentsProps {
  postId: string;
  pageSize?: number;
}

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  const { data, fetchMore } = useCommentsQuery({ variables: { postId, page: { first: pageSize } } });

  if (!data) {
    return (
      <>
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </>
    )
  }

  const { nodes: comments, pageInfo } = data.comments;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo?.endCursor,
        },
      },
    });
  };

  return (
    <div className="flex flex-col m-4 space-y-4">
      <h3 className="font-thin text-white">Comments</h3>
      {comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
      {data && pageInfo?.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Comments" />}
    </div>
  );
};
