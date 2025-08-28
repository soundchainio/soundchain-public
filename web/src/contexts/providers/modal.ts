/* eslint-disable react/display-name */
import { ModalActionTypes } from 'contexts/actions/modal';
import { initialModalState, ModalState } from 'contexts/reducers/modal';
import { ReactionType } from 'lib/graphql';
import { useContext } from 'react';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'types/SaleType';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';
import { store } from '..';
import { ShowConfirmDeleteEdition, ShowRemoveListing, ShowTransferNftConfirmationPayload } from '../payloads/modal';

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
    dispatchShowPostModal: (show: boolean, trackId?: string) =>
      dispatch({ type: ModalActionTypes.SHOW_NEW_POST, payload: { show, trackId } }),
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
    dispatchShowOgunTransferConfirmationModal: (show: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_OGUN_TRANSFER_CONFIRMATION, payload: { show } }),
    dispatchSetRecipientWalletAddress: (address: string) =>
      dispatch({ type: ModalActionTypes.SET_RECIPIENT_WALLET_ADDRESS, payload: { address } }),
    dispatchSetAmountToTransfer: (amount: string) =>
      dispatch({ type: ModalActionTypes.SET_AMOUNT_TO_TRANSFER, payload: { amount } }),
    dispatchShowApproveModal: (show: boolean, type: SaleType, nftContractAddress?: string | null) =>
      dispatch({ type: ModalActionTypes.SHOW_APPROVE, payload: { show, type, nftContractAddress } }),
    dispatchShowRemoveListingModal: (payload: ShowRemoveListing) =>
      dispatch({
        type: ModalActionTypes.SHOW_REMOVE_LISTING,
        payload: {
          ...payload,
          contractAddresses: payload.contractAddresses || {},
          editionId: payload.editionId || undefined,
        },
      }),
    dispatchShowConfirmDeleteNFTModal: (show: boolean, trackId: string, burn: boolean) =>
      dispatch({ type: ModalActionTypes.SHOW_CONFIRM_DELETE_NFT, payload: { show, trackId, burn } }),
    dispatchShowConfirmDeleteEditionModal: (payload: ShowConfirmDeleteEdition) =>
      dispatch({ type: ModalActionTypes.SHOW_CONFIRM_DELETE_EDITION, payload }),
    dispatchShowFilterMarketplaceModal: (
      show: boolean,
      genres: GenreLabel[] | undefined,
      filterSaleType: SaleTypeLabel | undefined,
      acceptsMATIC: boolean | undefined,
      acceptsOGUN: boolean | undefined,
      acceptsETH: boolean | undefined,
      acceptsUSDC: boolean | undefined,
      acceptsUSDT: boolean | undefined,
      acceptsSOL: boolean | undefined,
      acceptsBNB: boolean | undefined,
      acceptsDOGE: boolean | undefined,
      acceptsBONK: boolean | undefined,
      acceptsMEATEOR: boolean | undefined,
      acceptsPEPE: boolean | undefined,
      acceptsBASE: boolean | undefined,
      acceptsXTZ: boolean | undefined,
      acceptsAVAX: boolean | undefined,
      acceptsSHIB: boolean | undefined,
      acceptsXRP: boolean | undefined,
      acceptsSUI: boolean | undefined,
      acceptsHBAR: boolean | undefined,
      acceptsLINK: boolean | undefined,
      acceptsLTC: boolean | undefined,
      acceptsZETA: boolean | undefined,
      acceptsBTC: boolean | undefined,
      acceptsPENGU: boolean | undefined,
      acceptsYZY: boolean | undefined, // Added for YZY
    ) =>
      dispatch({
        type: ModalActionTypes.SHOW_FILTER_MARKETPLACE,
        payload: {
          show,
          genres,
          filterSaleType,
          acceptsMATIC,
          acceptsOGUN,
          acceptsETH,
          acceptsUSDC,
          acceptsUSDT,
          acceptsSOL,
          acceptsBNB,
          acceptsDOGE,
          acceptsBONK,
          acceptsMEATEOR,
          acceptsPEPE,
          acceptsBASE,
          acceptsXTZ,
          acceptsAVAX,
          acceptsSHIB,
          acceptsXRP,
          acceptsSUI,
          acceptsHBAR,
          acceptsLINK,
          acceptsLTC,
          acceptsZETA,
          acceptsBTC,
          acceptsPENGU,
          acceptsYZY, // Added for YZY
        },
      }),
    dispatchShowBidsHistory: (show: boolean, auctionId: string) =>
      dispatch({ type: ModalActionTypes.SHOW_BIDS_HISTORY, payload: { show, auctionId } }),
    dispatchShowNftTransferConfirmationModal: (payload: ShowTransferNftConfirmationPayload) =>
      dispatch({
        type: ModalActionTypes.SHOW_TRANSFER_NFT_CONFIRMATION,
        payload,
      }),
    dispatchUpdatePurchaseType: (type: 'single' | 'sweep' | 'bundle' | undefined) =>
      dispatch({ type: 'UPDATE_PURCHASE_TYPE', payload: type }),
    dispatchUpdateSweepQueue: (queue: string[]) =>
      dispatch({ type: 'UPDATE_SWEEP_QUEUE', payload: queue }),
  };
};
