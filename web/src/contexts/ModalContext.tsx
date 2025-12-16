import React, { createContext, useContext, useReducer } from 'react';
import { ModalActionTypes } from './actions/modal';
import { initialModalState, modalReducer } from './reducers/modal';

const ModalStateContext = createContext<any>(initialModalState);
const ModalDispatchContext = createContext<any>(null);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);

  return (
    <ModalStateContext.Provider value={state}>
      <ModalDispatchContext.Provider value={dispatch}>
        {children}
      </ModalDispatchContext.Provider>
    </ModalStateContext.Provider>
  );
};

export const useModalState = () => {
  const state = useContext(ModalStateContext);
  // Return empty object with all modals as false if undefined
  if (!state) {
    return {};
  }
  return state;
};

export const useModalDispatch = () => {
  const dispatch = useContext(ModalDispatchContext);
  if (!dispatch) {
    throw new Error('useModalDispatch must be used within ModalProvider');
  }
  return {
    dispatchShowCreateModal: (show: boolean, tab?: 'post' | 'mint') =>
      dispatch({ type: ModalActionTypes.SHOW_CREATE, payload: { show, tab } }),
    dispatchShowAudioPlayerModal: (show: boolean, fullscreen?: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_AUDIO_PLAYER, payload: { show, fullscreen } }),
    dispatchShowFilterMarketplaceModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_FILTER_MARKETPLACE, payload }),
    dispatchShowNftTransferConfirmationModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_TRANSFER_NFT_CONFIRMATION, payload }),
    dispatchShowUnderDevelopmentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_UNDER_DEVELOPMENT, payload: { show } }),
    dispatchShowAuthorActionsModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_CONTEXT_MENU, payload }),
    dispatchSetEditCommentId: (editCommentId: string | undefined) =>
      dispatch({ type: ModalActionTypes.SET_EDIT_COMMENT_ID, payload: { editCommentId } }),
    dispatchShowRemoveListingModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_REMOVE_LISTING, payload }),
    dispatchShowPostModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload }),
    dispatchSetEditPostId: (editPostId: string | undefined) =>
      dispatch({ type: ModalActionTypes.SET_EDIT_POST_ID, payload: { editPostId } }),
    dispatchShowCommentModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_COMMENT_MODAL, payload }),
    dispatchShowConfirmDeleteNFTModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_CONFIRM_DELETE_NFT, payload }),
    dispatchShowConfirmDeleteEditionModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_CONFIRM_DELETE_EDITION, payload }),
    dispatchShowBidsHistory: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_BIDS_HISTORY, payload }),
    dispatchShowApproveModal: (show: boolean, type?: any, nftContractAddress?: string | null) =>
      dispatch({ type: ModalActionTypes.SHOW_APPROVE, payload: { show, type, nftContractAddress } }),
    dispatchSetRepostId: (repostId: string | undefined) =>
      dispatch({ type: ModalActionTypes.SET_REPOST_ID, payload: { repostId } }),
    dispatchShowReactionsModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_REACTIONS, payload }),
    dispatchHideReactionsModal: () =>
      dispatch({ type: ModalActionTypes.HIDE_REACTIONS, payload: {} }),
    dispatchReactionsModal: (payload: any) =>
      dispatch({ type: ModalActionTypes.SHOW_REACTIONS, payload }),
    dispatchShowTransferConfirmationModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_TRANSFER_CONFIRMATION, payload: { show } }),
    dispatchShowOgunTransferConfirmationModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_OGUN_TRANSFER_CONFIRMATION, payload: { show } }),
  };
};