import { PageInput, useCommentsLazyQuery } from 'lib/graphql';
import { findIndex } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import * as Scroll from 'react-scroll';
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
  const [showingNewer, setShowingNewer] = useState(false);
  const [scrollToCommentId, setScrollToCommentId] = useState<string | null>(null);
  const scrollToCommentRef = useRef<HTMLDivElement>(null);

  const nodes = data?.comments.nodes || [];
  const commentIndex = findIndex(nodes, comment => comment.id === router.query.commentId);
  const olderComments = commentIndex === -1 ? nodes : nodes.slice(commentIndex, nodes.length);
  const comments = showingNewer ? nodes : olderComments;

  useEffect(() => {
    loadComments();
  }, []);

  useEffect(() => {
    if (scrollToCommentRef.current) {
      scrollToComment(scrollToCommentRef.current);
    }
  }, [comments.length]);

  if (!data || !fetchMore) return <CommentSkeleton />;

  const { pageInfo } = data.comments;
  const showViewNewer = comments.length < nodes.length || pageInfo.hasPreviousPage;

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
    setScrollToCommentId(comments[0].id);

    if (pageInfo.hasPreviousPage) {
      fetchMore({
        variables: {
          page: {
            last: pageSize,
            before: pageInfo.startCursor,
            inclusive: false,
          },
        },
      });
    }

    if (!showingNewer) {
      setShowingNewer(true);
    }
  };

  return (
    <div className="flex flex-col m-4 space-y-4">
      <h3 className="font-thin text-white">Comments</h3>
      {showViewNewer && (
        <div onClick={loadPrevious} className="cursor-pointer text-white">
          View Newer Comments
        </div>
      )}
      {comments.map(({ id }) => {
        if (id === scrollToCommentId) {
          return (
            <div key={id} ref={scrollToCommentRef}>
              <Comment commentId={id} />
              <Scroll.Element name="firstComment"></Scroll.Element>
            </div>
          );
        }
        return <Comment key={id} commentId={id} />;
      })}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadNext} loadingMessage="Loading Comments" />}
    </div>
  );
};

function scrollToComment(el: HTMLElement) {
  const main = document.querySelector('#main') as HTMLElement;
  const bottomSheet = document.querySelector('#bottom-sheet') as HTMLElement;
  const offset = el.clientHeight - main.clientHeight + bottomSheet.clientHeight;
  Scroll.scroller.scrollTo('firstComment', { containerId: 'main', duration: 0, offset });
}
