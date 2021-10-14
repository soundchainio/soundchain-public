import { ReactionType } from 'lib/graphql';
import { AuthorActionsType } from 'types/AuthorActionsType';

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

export interface ShowAuthorActionsPayload {
  showAuthorActions: boolean;
  authorActionsType: AuthorActionsType;
  authorActionsId: string;
}

export interface ShowReactionsPayload {
  postId?: string;
  top?: ReactionType[];
  total?: number;
}

export interface ShowCreatePayload {
  show: boolean;
}
export interface ShowAudioPlayerPayload {
  show: boolean;
}

export type ModalPayload =
  | ShowNewPostPayload
  | SetEditPostIdPayload
  | SetRepostIdPayload
  | ShowAuthorActionsPayload
  | ShowUnderDevelopmentPayload
  | ShowReactionsPayload
  | ShowCreatePayload
  | ShowAudioPlayerPayload;
