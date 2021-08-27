import classNames from 'classnames';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { DeleteModalType } from 'types/DeleteModalType';
import { Delete as DeleteButton } from './Buttons/Delete';
import { ModalsPortal } from './ModalsPortal';

const baseClasses =
  'fixed w-screen h-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const DeleteModal = () => {
  // const { data } = useDeleteCommentMutation({ variables: { id } });
  const { showDelete, deleteId, deleteType } = useModalState();
  const { dispatchShowDeleteModal } = useModalDispatch();

  const onOutsideClick = () => {
    dispatchShowDeleteModal(false, DeleteModalType.COMMENT, '');
  };

  const onDelete = () => {
    console.log('delete');
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
