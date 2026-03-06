import React, { createContext, ReactNode, useReducer } from 'react'
import combineReducers from 'react-combine-reducers'
import { Action, ActionTypes } from './actions'
import { Payloads } from './payloads'
import { initialModalState, modalReducer, ModalState } from './reducers/modal'

interface GlobalState {
  modal: ModalState
}

const [globalReducer, initialState] = combineReducers<GlobalReducer>({
  modal: [modalReducer, initialModalState],
})

interface ContextProps {
  state: GlobalState
  dispatch: ({ type }: { type: ActionTypes; payload: Payloads }) => void
}

interface StateProviderProps {
  children: ReactNode
}

type GlobalReducer = (state: GlobalState, action: Action) => GlobalState

const store = createContext({} as ContextProps)
const { Provider } = store

const StateProvider = ({ children }: StateProviderProps) => {
  const [state, dispatch] = useReducer<GlobalReducer>(globalReducer, initialState)

  return <Provider value={{ state, dispatch }}>{children}</Provider>
}

export { store, StateProvider }
