import { Action } from 'contexts/actions';
import { ModalActionTypes } from 'contexts/actions/modal';
import { SetRepostIdPayload, ShowDeletePayload, ShowFollowPayload, ShowNewPostPayload } from 'contexts/payloads/modal';
import { DeleteModalType } from 'types/DeleteModalType';
import { FollowModalType } from 'types/FollowModalType';

export interface ModalState {
  showNewPost: boolean;
  anyModalOpened: boolean;
  repostId?: string;
  showDelete: boolean;
  deleteType?: DeleteModalType;
  deleteId: string;
  showFollowModal: boolean;
  followModalType?: FollowModalType;
}

export const initialModalState = {
  showNewPost: false,
  anyModalOpened: false,
  repostId: undefined,
  showDelete: false,
  deleteType: undefined,
  deleteId: '',
  showFollowModal: false,
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
      };
    case ModalActionTypes.SHOW_FOLLOW_MODAL:
      return {
        ...state,
        showFollowModal: (action.payload as ShowFollowPayload).show,
      };
    default:
      return state;
  }
};
