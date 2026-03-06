import React, { createContext, useContext, useReducer } from 'react'
import { PanelActionTypes } from './actions/panel'
import { initialPanelState, panelReducer, PanelId, PanelState } from './reducers/panel'

const PanelStateContext = createContext<PanelState>(initialPanelState)
const PanelDispatchContext = createContext<any>(null)

export const PanelProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(panelReducer, initialPanelState)

  return (
    <PanelStateContext.Provider value={state}>
      <PanelDispatchContext.Provider value={dispatch}>{children}</PanelDispatchContext.Provider>
    </PanelStateContext.Provider>
  )
}

export const usePanelState = () => {
  const state = useContext(PanelStateContext)
  if (!state) {
    throw new Error('usePanelState must be used within PanelProvider')
  }
  return state
}

export const usePanelDispatch = () => {
  const dispatch = useContext(PanelDispatchContext)
  if (!dispatch) {
    throw new Error('usePanelDispatch must be used within PanelProvider')
  }

  return {
    openPanel: (panelId: PanelId) => dispatch({ type: PanelActionTypes.OPEN_PANEL, payload: { panelId } }),

    closePanel: (panelId: PanelId) => dispatch({ type: PanelActionTypes.CLOSE_PANEL, payload: { panelId } }),

    minimizePanel: (panelId: PanelId) => dispatch({ type: PanelActionTypes.MINIMIZE_PANEL, payload: { panelId } }),

    maximizePanel: (panelId: PanelId) => dispatch({ type: PanelActionTypes.MAXIMIZE_PANEL, payload: { panelId } }),

    togglePanel: (panelId: PanelId) => dispatch({ type: PanelActionTypes.TOGGLE_PANEL, payload: { panelId } }),

    setPanelPosition: (panelId: PanelId, position: { x: number; y: number }) =>
      dispatch({ type: PanelActionTypes.SET_PANEL_POSITION, payload: { panelId, position } }),

    setPanelScroll: (panelId: PanelId, scrollPosition: number) =>
      dispatch({ type: PanelActionTypes.SET_PANEL_SCROLL, payload: { panelId, scrollPosition } }),

    bringToFront: (panelId: PanelId) => dispatch({ type: PanelActionTypes.BRING_TO_FRONT, payload: { panelId } }),

    closeAllPanels: () => dispatch({ type: PanelActionTypes.CLOSE_ALL_PANELS, payload: {} }),
  }
}

// Custom hook to get panel-specific state and actions
export const usePanel = (panelId: PanelId) => {
  const state = usePanelState()
  const dispatch = usePanelDispatch()

  const panelData = state.panels[panelId]

  return {
    panel: panelData,
    isOpen: panelData.status === 'open',
    isMinimized: panelData.status === 'minimized',
    isClosed: panelData.status === 'closed',
    open: () => dispatch.openPanel(panelId),
    close: () => dispatch.closePanel(panelId),
    minimize: () => dispatch.minimizePanel(panelId),
    maximize: () => dispatch.maximizePanel(panelId),
    toggle: () => dispatch.togglePanel(panelId),
    bringToFront: () => dispatch.bringToFront(panelId),
  }
}
