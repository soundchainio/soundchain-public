import { ApolloCache, FetchResult } from '@apollo/client';
import classNames from 'classnames';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { CommentComponentFieldsFragment, RemoveCommentMutation, useRemoveCommentMutation } from 'lib/graphql';
import { DeleteModalType } from 'types/DeleteModalType';
import { Delete as DeleteButton } from './Buttons/Delete';
import { ModalsPortal } from './ModalsPortal';

const baseClasses =
  'fixed w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const DeleteModal = () => {
  const { showDelete, deleteId, deleteType, deleteCommentPostId } = useModalState();
  const { dispatchShowDeleteModal } = useModalDispatch();
  const [removeComment] = useRemoveCommentMutation({
    update: (cache, result) => updateCache(cache, result, deleteCommentPostId),
  });

  const onOutsideClick = () => {
    dispatchShowDeleteModal(false, DeleteModalType.COMMENT, '', '');
  };

  const onDelete = async () => {
    await removeComment({ variables: { input: { commentId: deleteId } } });
    onOutsideClick();
  };

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showDelete,
          'translate-y-full opacity-0': !showDelete,
        })}
      >
        <div className="flex flex-col h-screen">
          <div className="flex-1" onClick={onOutsideClick}></div>
          <div className="text-white p-4">
            <DeleteButton className="p-4" onClick={onDelete}>
              Delete {deleteType}
            </DeleteButton>
          </div>
        </div>
      </div>
    </ModalsPortal>
  );
};

function updateCache(cache: ApolloCache<RemoveCommentMutation>, { data }: FetchResult, postId: string) {
  cache.modify({
    id: 'ROOT_QUERY',
    fields: {
      comments(list, { readField }) {
        return list.filter(
          (comment: CommentComponentFieldsFragment) => readField('id', comment) !== data?.removeComment.comment.id,
        );
      },
    },
  });

  cache.evict({ id: cache.identify(data?.removeComment.comment) });
}
