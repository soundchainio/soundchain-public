import classNames from 'classnames';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { useDeleteCommentMutation, CommentsDocument } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { Delete as DeleteButton } from './Buttons/Delete';
import { Edit as EditButton } from './Buttons/Edit';
import { ModalsPortal } from './ModalsPortal';

const baseClasses =
  'fixed w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform';

export const AuthorActionsModal = () => {
  const { showAuthorActions, authorActionsId, authorActionsType } = useModalState();
  const { dispatchShowAuthorActionsModal, dispatchShowNewPostModal, dispatchSetEditPostId } = useModalDispatch();

  const [deleteComment] = useDeleteCommentMutation({
    refetchQueries: [CommentsDocument],
    update: (cache, data) => {
      cache.evict({ id: cache.identify(data.data?.deleteComment.comment!) });
    },
  });

  const onOutsideClick = () => {
    dispatchShowAuthorActionsModal(false, AuthorActionsType.POST, '');
  };

  const onEdit = () => {
    onOutsideClick();
    dispatchSetEditPostId(authorActionsId);
    dispatchShowNewPostModal(true);
  };

  const onDelete = async () => {
    await deleteComment({ variables: { input: { commentId: authorActionsId } } });
    onOutsideClick();
  };

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showAuthorActions,
          'translate-y-full opacity-0': !showAuthorActions,
        })}
      >
        <div className="flex flex-col h-screen">
          <div className="flex-1" onClick={onOutsideClick}></div>
          <div className="text-white p-4">
            <EditButton className="p-4 mb-4" onClick={onEdit}>
              Edit {authorActionsType}
            </EditButton>
            <DeleteButton className="p-4" onClick={onDelete}>
              Delete {authorActionsType}
            </DeleteButton>
          </div>
        </div>
      </div>
    </ModalsPortal>
  );
};
