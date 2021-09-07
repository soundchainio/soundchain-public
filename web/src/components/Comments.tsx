import { useGetPaginatedCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';
import { InfiniteLoader } from './InfiniteLoader';
import { CommentSkeleton } from './CommentSkeleton';
import { useEffect } from 'react';

interface CommentsProps {
  postId: string;
  pageSize?: number;
}

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  const { data, fetchMore } = useGetPaginatedCommentsQuery({ variables: { postId, page: { first: pageSize } } });

  if (!data) return <CommentSkeleton />;

  const pageInfo = data?.getPaginatedComments.pageInfo;
  const nodes = data?.getPaginatedComments.nodes;

  const commentIds = nodes.map(node => node.id);

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
      {commentIds.map(id => (
        <Comment key={id} commentId={id} />
      ))}
      {pageInfo?.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Comments" />}
    </div>
  );
};
