import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { DownArrow } from 'icons/DownArrow';
import { useReactionsLazyQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { Modal } from './Modal';
import { ReactionItem } from './ReactionItem';

export const ReactionsModal = () => {
  const { reactions: { postId, show, top, total } } = useModalState();
  const [reactions, { data, fetchMore }] = useReactionsLazyQuery({ variables: { postId: postId as string } });
  const { dispatchReactionsModal } = useModalDispatch();

  useEffect(() => {
    if (show && postId) {
      reactions();
    }
  }, [show, postId, reactions]);

  const onLoadMore = () => {
    if (fetchMore) {
      fetchMore({ variables: { postId, page: { after: data?.reactions.pageInfo.endCursor } } });
    }
  };

  const onClose = () => {
    dispatchReactionsModal(false, undefined);
  };

  return (
    <Modal show={show} title={`Reactions (${total})`} leftButton={
      <button className="h-10 w-10" onClick={onClose}><DownArrow /></button>
    } onClose={onClose}>
      <div className="h-full bg-gray-25">
        {!data ? <LoaderAnimation loadingMessage="Loading Reactions" /> : (
          <div>
            {data?.reactions.nodes.map(reaction => (
              <ReactionItem key={reaction.id} reaction={reaction} onClick={onClose} />
            ))}
          </div>
        )}
        {data?.reactions.pageInfo.hasNextPage && <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading More" />}
      </div>
    </Modal>
  );
};

export default ReactionsModal;
