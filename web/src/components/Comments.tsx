import { ApolloQueryResult } from '@apollo/client';
import { CommentsQuery, PageInfo, PageInput, useCommentsQuery } from 'lib/graphql';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
  const [newestPageInfo, setNewestPageInfo] = useState<PageInfo | null>(null);
  const [oldestPageInfo, setOldestPageInfo] = useState<PageInfo | null>(null);

  const { data, fetchMore } = useCommentsQuery({ variables: { postId, page: firstPage } });

  useEffect(() => {
    if (!newestPageInfo) {
      setNewestPageInfo(data?.comments.pageInfo);
    }
    if (!oldestPageInfo) {
      setOldestPageInfo(data?.comments.pageInfo);
    }
  }, [data?.comments.pageInfo]);

  if (!data) return <CommentSkeleton />;

  const { nodes: comments } = data.comments;

  const loadNext = async () => {
    const { data }: ApolloQueryResult<CommentsQuery> = await fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: oldestPageInfo?.endCursor,
          inclusive: false,
        },
      },
    });

    if (data.comments.pageInfo) {
      setOldestPageInfo(data.comments.pageInfo as PageInfo);
    }
  };

  const loadPrevious = async () => {
    const { data }: ApolloQueryResult<CommentsQuery> = await fetchMore({
      variables: {
        page: {
          last: pageSize,
          before: newestPageInfo?.startCursor,
          inclusive: false,
        },
      },
    });

    if (data.comments.pageInfo) {
      console.log('NEWEST PAGE', data.comments.pageInfo);
      setNewestPageInfo(data.comments.pageInfo as PageInfo);
    }
  };

  return (
    <div className="flex flex-col m-4 space-y-4">
      <h3 className="font-thin text-white">Comments</h3>
      {newestPageInfo?.hasPreviousPage && (
        <div onClick={loadPrevious} className="cursor-pointer text-white">
          View Newer Comments
        </div>
      )}
      {comments.map(({ id }) => (
        <Comment key={id} commentId={id} />
      ))}
      {oldestPageInfo?.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Comments" />}
    </div>
  );
};
