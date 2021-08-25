import React, { createContext, ReactNode, useReducer } from 'react';
import combineReducers from 'react-combine-reducers';
import { Action } from './actions';
import { ModalActionTypes } from './actions/modal';
import { initialModalState, ModalPayload, modalReducer, ModalState } from './reducers/modal';

export type Payloads = ModalPayload;
export type ActionTypes = ModalActionTypes;

interface ContextProps {
  state: GlobalState;
  dispatch: ({ type }: { type: ActionTypes; payload: Payloads }) => void;
}

interface StateProviderProps {
  children: ReactNode;
}

type GlobalReducer = (state: GlobalState, action: Action) => GlobalState;

interface GlobalState {
  modal: ModalState;
}

const store = createContext({} as ContextProps);
const { Provider } = store;

const [globalReducer, initialState] = combineReducers<GlobalReducer>({
  modal: [modalReducer, initialModalState],
});

const StateProvider = ({ children }: StateProviderProps) => {
  const [state, dispatch] = useReducer<GlobalReducer>(globalReducer, initialState);

  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
