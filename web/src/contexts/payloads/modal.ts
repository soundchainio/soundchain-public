import { ReactionType } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'types/SaleType';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';

export interface ShowNewPostPayload {
  show: boolean;
  trackId?: string;
}

export interface ShowTransferNftConfirmationPayload {
  show: boolean
  trackId?: string
  artworkUrl?: string
  artist?: string
  tokenId?: number
  walletRecipient?: string
  title?: string
  contractAddress?: string
  refetch?: () => void
}

export interface ShowCommentModalPayload {
  show: boolean;
}

export interface ShowUnderDevelopmentPayload {
  show: boolean;
}

export interface SetRepostIdPayload {
  repostId?: string;
}

export interface SetEditPostIdPayload {
  editPostId?: string;
}

export interface SetEditCommentIdPayload {
  editCommentId?: string;
}

export interface ShowAuthorActionsPayload {
  showAuthorActions: boolean;
  authorActionsType: AuthorActionsType;
  authorActionsId: string;
  showOnlyDeleteOption?: boolean;
}

export interface ShowReactionsPayload {
  postId?: string;
  top?: ReactionType[];
  total?: number;
}

export interface ShowCreatePayload {
  show: boolean;
}

export interface ShowApprove {
  show: boolean;
  type: SaleType;
  nftContractAddress: string | null
}

export interface ShowRemoveListing {
  show: boolean;
  tokenId: number;
  trackId: string;
  saleType: SaleType;
}

export interface ShowAudioPlayerPayload {
  show: boolean;
}

export interface ShowTransferConfirmationPayload {
  show: boolean;
}

export interface ShowMarketplaceFilterPayload {
  show: boolean;
  genres: GenreLabel[];
  filterSaleType: SaleTypeLabel;
}

export interface SetRecipientWalletAddress {
  address: string;
}

export interface SetAmountToTransfer {
  amount: string;
}

export interface ShowConfirmDeleteNFT {
  show: boolean;
  trackId?: string;
  burn: boolean;
}

export interface ShowBidsHistory {
  show: boolean;
  auctionId: string;
}

export type ModalPayload =
  | ShowNewPostPayload
  | ShowCommentModalPayload
  | SetEditPostIdPayload
  | SetEditCommentIdPayload
  | SetRepostIdPayload
  | ShowAuthorActionsPayload
  | ShowUnderDevelopmentPayload
  | ShowReactionsPayload
  | ShowCreatePayload
  | ShowAudioPlayerPayload
  | ShowTransferConfirmationPayload
  | SetRecipientWalletAddress
  | SetAmountToTransfer
  | ShowRemoveListing
  | ShowApprove
  | ShowConfirmDeleteNFT
  | ShowMarketplaceFilterPayload
  | ShowBidsHistory
  | ShowTransferNftConfirmationPayload;
