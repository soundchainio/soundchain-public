import { ModalActionTypes } from 'contexts/actions/modal'
import { initialModalState, ModalState } from 'contexts/reducers/modal'
import { ReactionType } from 'lib/graphql'
import { useContext } from 'react'
import { AuthorActionsType } from 'types/AuthorActionsType'
import { SaleType } from 'types/SaleType'
import { GenreLabel } from 'utils/Genres'
import { SaleTypeLabel } from 'utils/SaleTypeLabel'
import { store } from '..'
import { ShowConfirmDeleteEdition, ShowRemoveListing, ShowTransferNftConfirmationPayload } from '../payloads/modal'

export const useModalState = (): ModalState => {
  const { state } = useContext(store)
  if (!state) return initialModalState
  return state.modal
}

export const useModalDispatch = () => {
  const { dispatch } = useContext(store)
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
    ) => dispatch({ type: ModalActionTypes.SHOW_FILTER_MARKETPLACE, payload: { show, genres, filterSaleType } }),
    dispatchShowBidsHistory: (show: boolean, auctionId: string) =>
      dispatch({ type: ModalActionTypes.SHOW_BIDS_HISTORY, payload: { show, auctionId } }),
    dispatchShowNftTransferConfirmationModal: (payload: ShowTransferNftConfirmationPayload) =>
      dispatch({
        type: ModalActionTypes.SHOW_TRANSFER_NFT_CONFIRMATION,
        payload,
      }),
  }
}
