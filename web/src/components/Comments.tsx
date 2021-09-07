import { useGetPaginatedCommentsQuery } from 'lib/graphql';
import { Comment } from './Comment';
import { InfiniteLoader } from './InfiniteLoader';
import { CommentSkeleton } from './CommentSkeleton';
import { useEffect, useState } from 'react';

interface CommentsProps {
  postId: string;
  pageSize?: number;
}

const initialPageInfo = { endCursor: '', hasNextPage: false };

export const Comments = ({ postId, pageSize = 10 }: CommentsProps) => {
  const [commentIds, setCommentIds] = useState<Array<string>>(['']);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const { data, fetchMore } = useGetPaginatedCommentsQuery({ variables: { postId, page: { first: pageSize } } });

  useEffect(() => {
    if (data) {
      const iDs = data.getPaginatedComments.nodes.map(node => node.id);
      const newPageInfo = data.getPaginatedComments.pageInfo;
      setPageInfo({ hasNextPage: newPageInfo.hasNextPage, endCursor: newPageInfo.endCursor || '' });
      setCommentIds(iDs);
    }

  }, [data]);

  if (!data) return <CommentSkeleton />;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo?.endCursor,
        }
      }
    }).then(result => {
      const newIds = result.data.getPaginatedComments.nodes.map(node => node.id);
      const newPageInfo = result.data.getPaginatedComments.pageInfo;
      setCommentIds([...commentIds, ...newIds]);
      setPageInfo({ hasNextPage: newPageInfo.hasNextPage, endCursor: newPageInfo.endCursor || '' });
    });
  }

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
