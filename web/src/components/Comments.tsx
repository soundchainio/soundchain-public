import { PageInput, useCommentsLazyQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Comment } from './Comment';
import { CommentSkeleton } from './CommentSkeleton';
import { InfiniteLoader } from './InfiniteLoader';

interface CommentsProps {
  postId: string;
  pageSize?: number;
}

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  const router = useRouter();
  const inclusiveCursor = router.query.cursor;
  const firstPage: PageInput = { first: pageSize };
  if (typeof inclusiveCursor === 'string') {
    firstPage.after = inclusiveCursor;
    firstPage.inclusive = true;
  }

  const [loadComments, { data, fetchMore }] = useCommentsLazyQuery({
    variables: { postId, page: firstPage },
  });

  useEffect(() => {
    loadComments();
  }, []);

  if (!data) return <CommentSkeleton />;

  const { nodes: comments, pageInfo } = data.comments;

  const loadNext = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
          inclusive: false,
        },
      },
    });
  };

  const loadPrevious = () => {
    fetchMore({
      variables: {
        page: {
          last: pageSize,
          before: pageInfo.startCursor,
          inclusive: false,
        },
      },
    });
  };

  return (
    <div className="flex flex-col m-4 space-y-4">
      <h3 className="font-thin text-white">Comments</h3>
      {pageInfo.hasPreviousPage && (
        <div onClick={loadPrevious} className="cursor-pointer text-white">
          View Newer Comments
        </div>
      )}
      {comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Comments" />}
    </div>
  );
};
