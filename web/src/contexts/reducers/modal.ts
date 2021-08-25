import { Action } from 'contexts/actions';
import { ModalActionTypes } from 'contexts/actions/modal';
import { SetRepostIdPayload, ShowNewPostPayload } from 'contexts/payloads/modal';

export interface ModalState {
  showNewPost: boolean;
  anyModalOpened: boolean;
  repostId?: string;
}

export const initialModalState = {
  showNewPost: false,
  anyModalOpened: false,
  repostId: undefined,
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
    default:
      return state;
  }
};
