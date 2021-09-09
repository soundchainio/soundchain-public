import { DeleteModalType } from 'types/DeleteModalType';

export interface ShowNewPostPayload {
  show: boolean;
}

export interface ShowUnderDevelopmentPayload {
  show: boolean;
}

export interface SetRepostIdPayload {
  repostId?: string;
}

export interface ShowDeletePayload {
  show: boolean;
  type: DeleteModalType;
  deleteId: string;
}

export type ModalPayload = ShowNewPostPayload | SetRepostIdPayload | ShowDeletePayload | ShowUnderDevelopmentPayload;
