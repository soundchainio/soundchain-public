import { ReactionType } from 'lib/graphql';
import { ContextMenuType } from 'types/ContextMenuType';

export interface ShowNewPostPayload {
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

export interface ShowContextMenuPayload {
  showContextMenu: boolean;
  contextMenuType: ContextMenuType;
  contextMenuId: string;
}

export interface ShowReactionsPayload {
  postId?: string;
  top?: ReactionType[];
  total?: number;
}

export type ModalPayload =
  | ShowNewPostPayload
  | SetEditPostIdPayload
  | SetRepostIdPayload
  | ShowContextMenuPayload
  | ShowUnderDevelopmentPayload
  | ShowReactionsPayload;
