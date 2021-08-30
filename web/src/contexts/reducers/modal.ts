import { Action } from 'contexts/actions';
import { ModalActionTypes } from 'contexts/actions/modal';
import { SetRepostIdPayload, ShowDeletePayload, ShowNewPostPayload } from 'contexts/payloads/modal';
import { DeleteModalType } from 'types/DeleteModalType';

export interface ModalState {
  showNewPost: boolean;
  anyModalOpened: boolean;
  repostId?: string;
  showDelete: boolean;
  deleteType?: DeleteModalType;
  deleteId: string;
  deleteCommentPostId: string;
}

export const initialModalState = {
  showNewPost: false,
  anyModalOpened: false,
  repostId: undefined,
  showDelete: false,
  deleteType: undefined,
  deleteId: '',
  deleteCommentPostId: '',
};

export const modalReducer = (state: ModalState, action: Action) => {
  switch (action.type) {
    case ModalActionTypes.SHOW_NEW_POST:
      return {
        ...state,
        showNewPost: (action.payload as ShowNewPostPayload).show,
        anyModalOpened: (action.payload as ShowNewPostPayload).show,
      };
    case ModalActionTypes.SET_REPOST_ID:
      return {
        ...state,
        repostId: (action.payload as SetRepostIdPayload).repostId,
      };
    case ModalActionTypes.SHOW_DELETE:
      return {
        ...state,
        showDelete: (action.payload as ShowDeletePayload).show,
        anyModalOpened: (action.payload as ShowDeletePayload).show,
        deleteType: (action.payload as ShowDeletePayload).type,
        deleteId: (action.payload as ShowDeletePayload).deleteId,
        deleteCommentPostId: (action.payload as ShowDeletePayload).deleteCommentPostId,
      };
    default:
      return state;
  }
};
