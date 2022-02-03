import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { DownArrow } from 'icons/DownArrow';
import { ReactionEmoji } from 'icons/ReactionEmoji';
import { Reaction, useReactionsLazyQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { LoaderAnimation } from './LoaderAnimation';
import { Modal } from './Modal';
import { ReactionItem } from './ReactionItem';

export const ReactionsModal = () => {
  const {
    reactions: { postId, show, top, total },
  } = useModalState();
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

  const getTitle = () => {
    return (
      <div className="flex flex-row self-center items-center justify-center">
        {top?.map(reaction => (
          <>
            <ReactionEmoji key={reaction} name={reaction} className="w-4 h-4 mr-2" />
          </>
        ))}
        <span className="pr-2">{total}</span>
        <div className="text-sm text-gray-60 font-normal">reaction{total && total > 1 ? 's' : null}</div>
      </div>
    );
  };

  return (
    <Modal
      show={show}
      title={getTitle()}
      leftButton={
        <div className="flex justify-start ml-6">
          <button aria-label="Close" className="w-10 h-10 flex justify-center items-center" onClick={onClose}>
            <DownArrow />
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="bg-gray-25 h-full">
        {!data && (
          <div className="flex items-center">
            <LoaderAnimation loadingMessage="Loading Rections" />
          </div>
        )}
        <div>
          {data?.reactions.nodes.map(reaction => (
            <ReactionItem key={reaction.id} reaction={reaction as Reaction} onClick={onClose} />
          ))}
        </div>
        {data?.reactions.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading   Followers" />
        )}
      </div>
    </Modal>
  );
};

export default ReactionsModal;
