import { PageInput, useCommentsQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { Comment } from './Comment';
import { CommentSkeleton } from './CommentSkeleton';
import { InfiniteLoader } from './InfiniteLoader';

interface CommentsProps {
  postId: string;
  pageSize?: number;
}

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  const router = useRouter();
  const inclusiveCursor = router.query.commentCursor;
  const firstPage: PageInput = { first: pageSize };
  if (typeof inclusiveCursor === 'string') {
    firstPage.after = inclusiveCursor;
    firstPage.inclusive = true;
  }

  const { data, fetchMore } = useCommentsQuery({ variables: { postId, page: firstPage } });

  if (!data) return <CommentSkeleton />;

  const { nodes: comments, pageInfo } = data.comments;
  console.log(comments.length);
  const loadNext = () => {
    console.log('LOAD NEXT');
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
