import { ModalActionTypes } from 'contexts/actions/modal';
import { initialModalState, ModalState } from 'contexts/reducers/modal';
import { ReactionType } from 'lib/graphql';
import { useContext } from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
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
    dispatchShowPostModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload: { show } }),
    dispatchShowUnderDevelopmentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_UNDER_DEVELOPMENT, payload: { show } }),
    dispatchShowAuthorActionsModal: (
      showAuthorActions: boolean,
      authorActionsType: AuthorActionsType,
      authorActionsId: string,
    ) =>
      dispatch({
        type: ModalActionTypes.SHOW_CONTEXT_MENU,
        payload: { showAuthorActions, authorActionsType, authorActionsId },
      }),
    dispatchReactionsModal: (show: boolean, postId?: string, top?: ReactionType[], total?: number) =>
      dispatch({
        type: show ? ModalActionTypes.SHOW_REACTIONS : ModalActionTypes.HIDE_REACTIONS,
        payload: { postId, top, total },
      }),
    dispatchShowCreateModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_CREATE, payload: { show } }),
    dispatchShowAudioPlayerModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_AUDIO_PLAYER, payload: { show } }),
    dispatchShowApproveModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_APPROVE, payload: { show } }),
  };
};
