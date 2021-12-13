import { ReactionType } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'types/SaleType';

export interface ShowNewPostPayload {
  show: boolean;
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
}

export interface SetRecipientWalletAddress {
  address: string;
}

export interface SetAmountToTransfer {
  amount: string;
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
  | ShowMarketplaceFilterPayload;
