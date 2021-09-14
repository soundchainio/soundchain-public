import { ApolloCache, FetchResult } from '@apollo/client';
import classNames from 'classnames';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { DeleteCommentMutation, useDeleteCommentMutation, CommentsDocument } from 'lib/graphql';
import { ContextMenuType } from 'types/ContextMenuType';
import { Delete as DeleteButton } from './Buttons/Delete';
import { Button } from './Button';
import { ModalsPortal } from './ModalsPortal';

const baseClasses =
  'fixed w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform';

export const ContextMenuModal = () => {
  const { showContextMenu, contextMenuId, contextMenuType } = useModalState();
  const { dispatchShowContextMenuModal, dispatchShowNewPostModal, dispatchSetEditPostId } = useModalDispatch();

  const [deleteComment] = useDeleteCommentMutation({
    refetchQueries: [CommentsDocument],
    update: (cache, result) => updateCacheOnDelete(cache, result),
  });

  const onOutsideClick = () => {
    dispatchShowContextMenuModal(false, ContextMenuType.COMMENT, '');
  };

  const onEdit = async () => {
    onOutsideClick();
    dispatchSetEditPostId(contextMenuId);
    dispatchShowNewPostModal(true);
  };

  const onDelete = async () => {
    await deleteComment({ variables: { input: { commentId: contextMenuId } } });
    onOutsideClick();
  };

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showContextMenu,
          'translate-y-full opacity-0': !showContextMenu,
        })}
      >
        <div className="flex flex-col h-screen">
          <div className="flex-1" onClick={onOutsideClick}></div>
          <div className="text-white p-4">
            <Button variant="outline" className="p-4" onClick={onEdit}>
              Edit {contextMenuType}
            </Button>
            <DeleteButton className="p-4" onClick={onDelete}>
              Delete {contextMenuType}
            </DeleteButton>
          </div>
        </div>
      </div>
    </ModalsPortal>
  );
};

function updateCacheOnDelete(cache: ApolloCache<DeleteCommentMutation>, { data }: FetchResult) {
  cache.evict({ id: cache.identify(data?.deleteComment.comment) });
};