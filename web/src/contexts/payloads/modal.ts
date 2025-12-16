import { ContractAddresses } from 'hooks/useBlockchainV2';
import { ReactionType } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';
import { SaleType } from 'lib/graphql';
import { GenreLabel } from 'utils/Genres';
import { SaleTypeLabel } from 'utils/SaleTypeLabel';

export interface ShowNewPostPayload {
  show: boolean;
  trackId?: string;
}

export interface ShowTransferNftConfirmationPayload {
  show: boolean;
  trackId?: string;
  artworkUrl?: string;
  artist?: string;
  tokenId?: number;
  walletRecipient?: string;
  title?: string;
  contractAddress?: string;
  refetch?: () => void;
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
  tab?: 'post' | 'mint';
}

export interface ShowApprove {
  show: boolean;
  type: SaleType;
  nftContractAddress?: string | null;
}

export interface ShowRemoveListing {
  show: boolean;
  tokenId?: number;
  trackId?: string;
  editionId?: number;
  saleType: SaleType;
  contractAddresses?: ContractAddresses;
  trackEditionId?: string;
}

export interface ShowAudioPlayerPayload {
  show: boolean;
  fullscreen?: boolean;
}

export interface ShowOgunTransferConfirmationPayload {
  show: boolean;
}

export interface ShowTransferConfirmationPayload {
  show: boolean;
}

export interface ShowMarketplaceFilterPayload {
  show: boolean;
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
  acceptsYZY?: boolean | undefined;
  // Add transaction-related properties (might need a separate action)
  transactionStatus?: any;
  bundleSelections?: string[] | undefined;
  sweepQueue?: string[] | undefined;
  purchaseType?: 'single' | 'sweep' | 'bundle' | undefined;
  transactionFee?: number | undefined;
  customBundle?: { nftIds: string[]; tokenSymbol: string; tokenAmount: number; chainId: number; privateAsset?: string }[] | undefined;
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

export interface ShowConfirmDeleteEdition {
  show: boolean;
  trackEditionId: string;
  trackId: string;
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
