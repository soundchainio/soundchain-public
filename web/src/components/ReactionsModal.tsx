import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { Reaction, useReactionsLazyQuery } from 'lib/graphql';
import { useEffect } from 'react';
import { InfiniteLoader } from './InfiniteLoader';
import { LoaderAnimation } from './LoaderAnimation';
import { Modal } from './Modal';
import { ReactionItem } from './ReactionItem';

export const ReactionsModal = () => {
  const {
    reactions: { postId, show },
  } = useModalState();
  const [reactions, { data, fetchMore }] = useReactionsLazyQuery({ variables: { postId } });
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
    return data ? `${data.reactions.pageInfo.totalCount} reactions` : 'Reactions';
  };

  return (
    <Modal
      show={show}
      title={getTitle()}
      leftButton={
        <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={onClose}>
          Close
        </div>
      }
      onClose={onClose}
    >
      <>
        {!data && (
          <div className="flex items-center">
            <LoaderAnimation loadingMessage="Loading Rections" />
          </div>
        )}
        <div className="space-y-6 ">
          {data?.reactions.nodes.map(reaction => (
            <ReactionItem key={reaction.id} reaction={reaction as Reaction} />
          ))}
        </div>
        {data?.reactions.pageInfo.hasNextPage && (
          <InfiniteLoader loadMore={onLoadMore} loadingMessage="Loading Followers" />
        )}
      </>
    </Modal>
  );
};
