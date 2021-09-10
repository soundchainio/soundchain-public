import { ModalActionTypes } from 'contexts/actions/modal';
import { initialModalState, ModalState } from 'contexts/reducers/modal';
import { ReactionType } from 'lib/graphql';
import { useContext } from 'react';
import { DeleteModalType } from 'types/DeleteModalType';
import { store } from '..';

export const useModalState = (): ModalState => {
  const { state } = useContext(store);
  if (!state) return initialModalState;
  return state.modal;
};

export const useModalDispatch = () => {
  const { dispatch } = useContext(store);
  return {
    dispatchSetRepostId: (repostId?: string) =>
      dispatch({ type: ModalActionTypes.SET_REPOST_ID, payload: { repostId } }),
    dispatchShowNewPostModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload: { show } }),
    dispatchShowUnderDevelopmentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_UNDER_DEVELOPMENT, payload: { show } }),
    dispatchShowDeleteModal: (show: boolean, type: DeleteModalType, deleteId: string) =>
      dispatch({ type: ModalActionTypes.SHOW_DELETE, payload: { show, type, deleteId } }),
    dispatchReactionsModal: (show: boolean, postId?: string, top?: ReactionType[], total?: number) =>
      dispatch({
        type: show ? ModalActionTypes.SHOW_REACTIONS : ModalActionTypes.HIDE_REACTIONS,
        payload: { postId, top, total },
      }),
  };
};
