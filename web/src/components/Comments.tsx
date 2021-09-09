import { enableBodyScroll } from 'body-scroll-lock';
import { PageInput, useCommentsLazyQuery } from 'lib/graphql';
import { findIndex } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { animateScroll } from 'react-scroll';
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

  const [loadComments, { data, fetchMore, loading }] = useCommentsLazyQuery({
    variables: { postId, page: firstPage },
  });
  const [showingNewer, setShowingNewer] = useState(false);
  const [firstCommentId, setFirstCommentId] = useState<string | string[] | undefined>(router.query.commentId);
  const firstCommentRef = useRef<HTMLDivElement>(null);
  const [viewNewerClickY, setViewNewerClickY] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
    enableBodyScroll(window.document.body);
  }, []);

  useEffect(() => {
    // if (!loading && viewNewerClickY) {
    // console.log(viewNewerClickY);
    // window.scroll({ top: 300, left: 0, behavior: 'smooth' });
    if (!loading) {
      animateScroll.scrollToBottom({ duration: 1000 });
      window.scrollTo(0, containerRef.current?.scrollHeight);
    }
    // }
  });

  if (!data || !fetchMore) return <CommentSkeleton />;

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

  const loadPrevious: React.MouseEventHandler<HTMLDivElement> = async e => {
    animateScroll.scrollToBottom({ duration: 0 });
    // if (pageInfo.hasPreviousPage) {
    //   await fetchMore({
    //     variables: {
    //       page: {
    //         last: pageSize,
    //         before: pageInfo.startCursor,
    //         inclusive: false,
    //       },
    //     },
    //   });
    // }
    // if (!showingNewer) {
    //   setShowingNewer(true);
    // }
  };

  const { nodes, pageInfo } = data.comments;
  const commentIndex = findIndex(nodes, comment => comment.id === router.query.commentId);
  const olderComments = commentIndex === -1 ? nodes : nodes.slice(commentIndex, nodes.length);
  const comments = showingNewer ? nodes : olderComments;
  const showViewNewer = comments.length < nodes.length || pageInfo.hasPreviousPage;

  return (
    <div className="flex flex-col m-4 space-y-4" ref={containerRef}>
      <h3 className="font-thin text-white">Comments</h3>
      {showViewNewer && (
        <div onClick={loadPrevious} className="cursor-pointer text-white">
          View Newer Comments
        </div>
      )}
      {comments.map(({ id }) => {
        if (id === firstCommentId) {
          return (
            <div ref={firstCommentRef} key={id}>
              <Comment commentId={id} />
            </div>
          );
        }
        return <Comment key={id} commentId={id} />;
      })}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Comments" />}
    </div>
  );
};
