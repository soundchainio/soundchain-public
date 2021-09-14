import { ModalActionTypes } from 'contexts/actions/modal';
import { initialModalState, ModalState } from 'contexts/reducers/modal';
import { ReactionType } from 'lib/graphql';
import { useContext } from 'react';
import { ContextMenuType } from 'types/ContextMenuType';
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
    dispatchSetEditPostId: (editPostId?: string) =>
      dispatch({ type: ModalActionTypes.SET_EDIT_POST_ID, payload: { editPostId } }),
    dispatchShowNewPostModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload: { show } }),
    dispatchShowUnderDevelopmentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_UNDER_DEVELOPMENT, payload: { show } }),
    dispatchShowContextMenuModal: (showContextMenu: boolean, contextMenuType: ContextMenuType, contextMenuId: string) =>
      dispatch({ type: ModalActionTypes.SHOW_CONTEXT_MENU, payload: { showContextMenu, contextMenuType, contextMenuId } }),
    dispatchReactionsModal: (show: boolean, postId?: string, top?: ReactionType[], total?: number) =>
      dispatch({
        type: show ? ModalActionTypes.SHOW_REACTIONS : ModalActionTypes.HIDE_REACTIONS,
        payload: { postId, top, total },
      }),
  };
};
