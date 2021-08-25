export interface ShowNewPostPayload {
  show: boolean;
}

export interface SetRepostIdPayload {
  repostId?: string;
}

export type ModalPayload = ShowNewPostPayload | SetRepostIdPayload;
