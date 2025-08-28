import { Action } from 'contexts/actions';
import { ModalActionTypes } from 'contexts/actions/modal';
import {
  SetAmountToTransfer,
  SetEditCommentIdPayload,
  SetEditPostIdPayload,
  SetRecipientWalletAddress,
  SetRepostIdPayload,
  ShowApprove,
  ShowAudioPlayerPayload,
  ShowAuthorActionsPayload,
  ShowBidsHistory,
  ShowCommentModalPayload,
  ShowConfirmDeleteEdition,
  ShowConfirmDeleteNFT,
  ShowCreatePayload,
  ShowMarketplaceFilterPayload,
  ShowNewPostPayload,
  ShowOgunTransferConfirmationPayload,
  ShowReactionsPayload,
  ShowRemoveListing,
  ShowTransferConfirmationPayload,
  ShowTransferNftConfirmationPayload,
  ShowUnderDevelopmentPayload,
} from 'contexts/payloads/modal';
import { ContractAddresses } from 'hooks/useBlockchainV2';
import { ReactionType, TracksQuery } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'types/SaleType';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';

export interface ModalState {
  showNewPost: boolean;
  showCommentModal: boolean;
  anyModalOpened: boolean;
  repostId?: string;
  editPostId?: string;
  editCommentId?: string;
  editionId?: number;
  showAuthorActions: boolean;
  authorActionsType?: AuthorActionsType;
  authorActionsId: string;
  showOnlyDeleteOption?: boolean;
  showUnderDevelopment: boolean;
  showCreate: boolean;
  showAudioPlayer: boolean;
  showApprove: boolean;
  showRemoveListing: boolean;
  showBidsHistory: boolean;
  tokenId?: number;
  trackId?: string;
  trackEditionId?: string;
  reactions: {
    show: boolean;
    postId?: string;
    total?: number;
    top?: ReactionType[];
  };
  showTransferConfirmation: boolean;
  showOgunTransferConfirmation: boolean;
  walletRecipient?: string;
  amountToTransfer?: string;
  type?: SaleType;
  saleType?: SaleType;
  nftContractAddress?: string | null;
  contractAddresses?: ContractAddresses;
  showConfirmDeleteNFT: boolean;
  showConfirmDeleteEdition: boolean;
  burn?: boolean;
  showMarketplaceFilter: boolean;
  genres?: GenreLabel[];
  filterSaleType?: SaleTypeLabel;
  acceptsMATIC?: boolean | undefined;
  acceptsOGUN?: boolean | undefined;
  acceptsETH?: boolean | undefined;
  acceptsUSDC?: boolean | undefined;
  acceptsUSDT?: boolean | undefined;
  acceptsSOL?: boolean | undefined;
  acceptsBNB?: boolean | undefined;
  acceptsDOGE?: boolean | undefined;
  acceptsBONK?: boolean | undefined;
  acceptsMEATEOR?: boolean | undefined;
  acceptsPEPE?: boolean | undefined;
  acceptsBASE?: boolean | undefined;
  acceptsXTZ?: boolean | undefined;
  acceptsAVAX?: boolean | undefined;
  acceptsSHIB?: boolean | undefined;
  acceptsXRP?: boolean | undefined;
  acceptsSUI?: boolean | undefined;
  acceptsHBAR?: boolean | undefined;
  acceptsLINK?: boolean | undefined;
  acceptsLTC?: boolean | undefined;
  acceptsZETA?: boolean | undefined;
  acceptsBTC?: boolean | undefined;
  acceptsPENGU?: boolean | undefined;
  acceptsYZY?: boolean | undefined; // Added for YZY
  transactionStatus?: any; // Matches dispatch type, refine later
  bundleSelections?: string[] | undefined;
  sweepQueue?: string[] | undefined;
  purchaseType?: 'single' | 'sweep' | 'bundle' | undefined;
  transactionFee?: number | undefined;
  customBundle?: { nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined;
  auctionId?: string;
  showTransferNftConfirmation: boolean;
  track?: TracksQuery['tracks'];
  refetch?: () => void;
}

export const initialModalState = {
  showNewPost: false,
  showCommentModal: false,
  anyModalOpened: false,
  repostId: undefined,
  editPostId: undefined,
  editCommentId: undefined,
  showAuthorActions: false,
  authorActionsType: undefined,
  authorActionsId: '',
  showOnlyDeleteOption: false,
  showUnderDevelopment: false,
  showCreate: false,
  showAudioPlayer: false,
  showApprove: false,
  showRemoveListing: false,
  showBidsHistory: false,
  reactions: {
    show: false,
    postId: undefined,
    top: [],
    total: undefined,
  },
  showTransferConfirmation: false,
  showOgunTransferConfirmation: false,
  walletRecipient: undefined,
  amountToTransfer: undefined,
  type: undefined,
  burn: false,
  showConfirmDeleteNFT: false,
  showConfirmDeleteEdition: false,
  showMarketplaceFilter: false,
  genres: undefined,
  filterSaleType: undefined,
  acceptsMATIC: undefined,
  acceptsOGUN: undefined,
  acceptsETH: undefined,
  acceptsUSDC: undefined,
  acceptsUSDT: undefined,
  acceptsSOL: undefined,
  acceptsBNB: undefined,
  acceptsDOGE: undefined,
  acceptsBONK: undefined,
  acceptsMEATEOR: undefined,
  acceptsPEPE: undefined,
  acceptsBASE: undefined,
  acceptsXTZ: undefined,
  acceptsAVAX: undefined,
  acceptsSHIB: undefined,
  acceptsXRP: undefined,
  acceptsSUI: undefined,
  acceptsHBAR: undefined,
  acceptsLINK: undefined,
  acceptsLTC: undefined,
  acceptsZETA: undefined,
  acceptsBTC: undefined,
  acceptsPENGU: undefined,
  acceptsYZY: undefined, // Added for YZY
  transactionStatus: undefined,
  bundleSelections: undefined,
  sweepQueue: undefined,
  purchaseType: undefined,
  transactionFee: undefined,
  customBundle: undefined,
  auctionId: undefined,
  showTransferNftConfirmation: false,
};

export const modalReducer = (state: ModalState, action: Action) => {
  switch (action.type) {
    case ModalActionTypes.SHOW_NEW_POST:
      return {
        ...state,
        showNewPost: (action.payload as ShowNewPostPayload).show,
        anyModalOpened: (action.payload as ShowNewPostPayload).show,
        trackId: (action.payload as ShowNewPostPayload).trackId,
      };
    case ModalActionTypes.SHOW_COMMENT_MODAL:
      return {
        ...state,
        showCommentModal: (action.payload as ShowCommentModalPayload).show,
        anyModalOpened: (action.payload as ShowCommentModalPayload).show,
      };
    case ModalActionTypes.SET_REPOST_ID:
      return {
        ...state,
        repostId: (action.payload as SetRepostIdPayload).repostId,
      };
    case ModalActionTypes.SET_EDIT_POST_ID:
      return {
        ...state,
        editPostId: (action.payload as SetEditPostIdPayload).editPostId,
      };
    case ModalActionTypes.SET_EDIT_COMMENT_ID:
      return {
        ...state,
        authorActionsType: AuthorActionsType.COMMENT,
        editCommentId: (action.payload as SetEditCommentIdPayload).editCommentId,
      };
    case ModalActionTypes.SHOW_CONTEXT_MENU:
      return {
        ...state,
        showAuthorActions: (action.payload as ShowAuthorActionsPayload).showAuthorActions,
        anyModalOpened: (action.payload as ShowAuthorActionsPayload).showAuthorActions,
        authorActionsType: (action.payload as ShowAuthorActionsPayload).authorActionsType,
        authorActionsId: (action.payload as ShowAuthorActionsPayload).authorActionsId,
        showOnlyDeleteOption: (action.payload as ShowAuthorActionsPayload).showOnlyDeleteOption,
      };
    case ModalActionTypes.SHOW_UNDER_DEVELOPMENT:
      return {
        ...state,
        showUnderDevelopment: (action.payload as ShowUnderDevelopmentPayload).show,
        anyModalOpened: (action.payload as ShowUnderDevelopmentPayload).show,
      };
    case ModalActionTypes.SHOW_REACTIONS:
      return {
        ...state,
        reactions: {
          show: true,
          postId: (action.payload as ShowReactionsPayload).postId,
          top: (action.payload as ShowReactionsPayload).top,
          total: (action.payload as ShowReactionsPayload).total,
        },
      };
    case ModalActionTypes.HIDE_REACTIONS:
      return {
        ...state,
        reactions: {
          ...state.reactions,
          show: false,
        },
      };
    case ModalActionTypes.SHOW_CREATE:
      return {
        ...state,
        showCreate: (action.payload as ShowCreatePayload).show,
        anyModalOpened: (action.payload as ShowCreatePayload).show,
      };
    case ModalActionTypes.SHOW_APPROVE:
      return {
        ...state,
        showApprove: (action.payload as ShowApprove).show,
        type: (action.payload as ShowApprove).type,
        nftContractAddress: (action.payload as ShowApprove).nftContractAddress,
        anyModalOpened: (action.payload as ShowApprove).show,
      };
    case ModalActionTypes.SHOW_REMOVE_LISTING:
      return {
        ...state,
        showRemoveListing: (action.payload as ShowRemoveListing).show,
        tokenId: (action.payload as ShowRemoveListing).tokenId,
        trackId: (action.payload as ShowRemoveListing).trackId,
        saleType: (action.payload as ShowRemoveListing).saleType,
        anyModalOpened: (action.payload as ShowRemoveListing).show,
        editionId: (action.payload as ShowRemoveListing).editionId,
        contractAddresses: (action.payload as ShowRemoveListing).contractAddresses,
        trackEditionId: (action.payload as ShowRemoveListing).trackEditionId,
      };
    case ModalActionTypes.SHOW_AUDIO_PLAYER:
      return {
        ...state,
        showAudioPlayer: (action.payload as ShowAudioPlayerPayload).show,
        anyModalOpened: (action.payload as ShowAudioPlayerPayload).show,
      };
    case ModalActionTypes.SHOW_TRANSFER_CONFIRMATION:
      return {
        ...state,
        showTransferConfirmation: (action.payload as ShowTransferConfirmationPayload).show,
        anyModalOpened: (action.payload as ShowTransferConfirmationPayload).show,
      };
    case ModalActionTypes.SHOW_OGUN_TRANSFER_CONFIRMATION:
      return {
        ...state,
        showOgunTransferConfirmation: (action.payload as ShowOgunTransferConfirmationPayload).show,
        anyModalOpened: (action.payload as ShowOgunTransferConfirmationPayload).show,
      };
    case ModalActionTypes.SET_AMOUNT_TO_TRANSFER:
      return {
        ...state,
        amountToTransfer: (action.payload as SetAmountToTransfer).amount,
      };
    case ModalActionTypes.SET_RECIPIENT_WALLET_ADDRESS:
      return {
        ...state,
        walletRecipient: (action.payload as SetRecipientWalletAddress).address,
      };
    case ModalActionTypes.SHOW_CONFIRM_DELETE_NFT:
      return {
        ...state,
        showConfirmDeleteNFT: (action.payload as ShowConfirmDeleteNFT).show,
        anyModalOpened: (action.payload as ShowConfirmDeleteNFT).show,
        trackId: (action.payload as ShowConfirmDeleteNFT).trackId,
        burn: (action.payload as ShowConfirmDeleteNFT).burn,
      };
    case ModalActionTypes.SHOW_CONFIRM_DELETE_EDITION:
      return {
        ...state,
        showConfirmDeleteEdition: (action.payload as ShowConfirmDeleteEdition).show,
        anyModalOpened: (action.payload as ShowConfirmDeleteEdition).show,
        trackId: (action.payload as ShowConfirmDeleteEdition).trackId,
        trackEditionId: (action.payload as ShowConfirmDeleteEdition).trackEditionId,
      };
    case ModalActionTypes.SHOW_FILTER_MARKETPLACE:
      const payload = action.payload as ShowMarketplaceFilterPayload;
      return {
        ...state,
        showMarketplaceFilter: payload.show,
        genres: payload.genres,
        filterSaleType: payload.filterSaleType,
        acceptsMATIC: payload.acceptsMATIC,
        acceptsOGUN: payload.acceptsOGUN,
        acceptsETH: payload.acceptsETH,
        acceptsUSDC: payload.acceptsUSDC,
        acceptsUSDT: payload.acceptsUSDT,
        acceptsSOL: payload.acceptsSOL,
        acceptsBNB: payload.acceptsBNB,
        acceptsDOGE: payload.acceptsDOGE,
        acceptsBONK: payload.acceptsBONK,
        acceptsMEATEOR: payload.acceptsMEATEOR,
        acceptsPEPE: payload.acceptsPEPE,
        acceptsBASE: payload.acceptsBASE,
        acceptsXTZ: payload.acceptsXTZ,
        acceptsAVAX: payload.acceptsAVAX,
        acceptsSHIB: payload.acceptsSHIB,
        acceptsXRP: payload.acceptsXRP,
        acceptsSUI: payload.acceptsSUI,
        acceptsHBAR: payload.acceptsHBAR,
        acceptsLINK: payload.acceptsLINK,
        acceptsLTC: payload.acceptsLTC,
        acceptsZETA: payload.acceptsZETA,
        acceptsBTC: payload.acceptsBTC,
        acceptsPENGU: payload.acceptsPENGU,
        acceptsYZY: payload.acceptsYZY, // Added for YZY
        transactionStatus: payload.transactionStatus, // Add if payload includes it
        bundleSelections: payload.bundleSelections,
        sweepQueue: payload.sweepQueue,
        purchaseType: payload.purchaseType,
        transactionFee: payload.transactionFee,
        customBundle: payload.customBundle,
      };
    case ModalActionTypes.SHOW_BIDS_HISTORY:
      return {
        ...state,
        showBidsHistory: (action.payload as ShowBidsHistory).show,
        auctionId: (action.payload as ShowBidsHistory).auctionId,
      };
    case ModalActionTypes.SHOW_TRANSFER_NFT_CONFIRMATION:
      const transferPayload = action.payload as ShowTransferNftConfirmationPayload;
      const { show, ...rest } = transferPayload;
      return {
        ...state,
        showTransferNftConfirmation: show,
        ...rest,
      };
    default:
      return state;
  }
};
