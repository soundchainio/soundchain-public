import { Action } from 'contexts/actions';
import { ModalActionTypes } from 'contexts/actions/modal';
import {
  SetRepostIdPayload,
  ShowDeletePayload,
  ShowNewPostPayload,
  ShowReactionsPayload,
  ShowUnderDevelopmentPayload,
} from 'contexts/payloads/modal';
import { ReactionType } from 'lib/graphql';
import { DeleteModalType } from 'types/DeleteModalType';

export interface ModalState {
  showNewPost: boolean;
  anyModalOpened: boolean;
  repostId?: string;
  showDelete: boolean;
  deleteType?: DeleteModalType;
  deleteId: string;
  showUnderDevelopment: boolean;
  reactions: {
    show: boolean;
    postId: string;
    total: number;
    top: ReactionType[];
  };
}

export const initialModalState = {
  showNewPost: false,
  anyModalOpened: false,
  repostId: undefined,
  showDelete: false,
  deleteType: undefined,
  deleteId: '',
  showUnderDevelopment: false,
  reactions: {
    show: false,
    postId: undefined,
    top: [],
    total: undefined,
  },
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
    case ModalActionTypes.SHOW_UNDER_DEVELOPMENT:
      return {
        ...state,
        showUnderDevelopment: (action.payload as ShowUnderDevelopmentPayload).show,
        anyModalOpened: (action.payload as ShowUnderDevelopmentPayload).show,
      };
    case ModalActionTypes.SHOW_REACTIONS:
      return {
        ...state,
        reactions: {
          show: true,
          postId: (action.payload as ShowReactionsPayload).postId,
          top: (action.payload as ShowReactionsPayload).top,
          total: (action.payload as ShowReactionsPayload).total,
        },
      };
    case ModalActionTypes.HIDE_REACTIONS:
      return {
        ...state,
        reactions: {
          ...state.reactions,
          show: false,
        },
      };
    default:
      return state;
  }
};
