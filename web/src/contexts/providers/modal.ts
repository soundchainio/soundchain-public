import { ModalActionTypes } from 'contexts/actions/modal';
import { initialModalState, ModalState } from 'contexts/reducers/modal';
import { ReactionType } from 'lib/graphql';
import { useContext } from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'types/SaleType';
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
    dispatchSetEditCommentId: (editCommentId?: string) =>
      dispatch({ type: ModalActionTypes.SET_EDIT_COMMENT_ID, payload: { editCommentId } }),
    dispatchShowPostModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload: { show } }),
    dispatchShowCommentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_COMMENT_MODAL, payload: { show } }),
    dispatchShowUnderDevelopmentModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_UNDER_DEVELOPMENT, payload: { show } }),
    dispatchShowAuthorActionsModal: (
      showAuthorActions: boolean,
      authorActionsType: AuthorActionsType,
      authorActionsId: string,
      showOnlyDeleteOption = false,
    ) =>
      dispatch({
        type: ModalActionTypes.SHOW_CONTEXT_MENU,
        payload: { showAuthorActions, authorActionsType, authorActionsId, showOnlyDeleteOption },
      }),
    dispatchReactionsModal: (show: boolean, postId?: string, top?: ReactionType[], total?: number) =>
      dispatch({
        type: show ? ModalActionTypes.SHOW_REACTIONS : ModalActionTypes.HIDE_REACTIONS,
        payload: { postId, top, total },
      }),
    dispatchShowCreateModal: (show: boolean) => dispatch({ type: ModalActionTypes.SHOW_CREATE, payload: { show } }),
    dispatchShowAudioPlayerModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_AUDIO_PLAYER, payload: { show } }),
    dispatchShowTransferConfirmationModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_TRANSFER_CONFIRMATION, payload: { show } }),
    dispatchSetRecipientWalletAddress: (address: string) =>
      dispatch({ type: ModalActionTypes.SET_RECIPIENT_WALLET_ADDRESS, payload: { address } }),
    dispatchSetAmountToTransfer: (amount: string) =>
      dispatch({ type: ModalActionTypes.SET_AMOUNT_TO_TRANSFER, payload: { amount } }),
    dispatchShowApproveModal: (show: boolean, type: SaleType) =>
      dispatch({ type: ModalActionTypes.SHOW_APPROVE, payload: { show, type } }),
    dispatchShowRemoveListingModal: (show: boolean, tokenId: number, trackId: string, saleType: SaleType) =>
      dispatch({ type: ModalActionTypes.SHOW_REMOVE_LISTING, payload: { show, tokenId, trackId, saleType } }),
    dispatchShowFilterMarketplaceModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_FILTER_MARKETPLACE, payload: { show } }),
  };
};
