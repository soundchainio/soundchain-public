import { PanelActionTypes } from 'contexts/actions/panel'
import {
  OpenPanelPayload,
  ClosePanelPayload,
  MinimizePanelPayload,
  MaximizePanelPayload,
  TogglePanelPayload,
  SetPanelPositionPayload,
  SetPanelScrollPayload,
  BringToFrontPayload,
  PanelPayload,
} from 'contexts/payloads/panel'

interface PanelAction {
  type: PanelActionTypes
  payload: PanelPayload
}

export type PanelId =
  | 'marketplace'
  | 'feed'
  | 'dashboard'
  | 'profile'
  | 'wallet'
  | 'settings'
  | 'notifications'
  | 'messages'
  | 'create'
  | 'discover'
  | 'collections'
  | 'analytics'

export type PanelStatus = 'open' | 'minimized' | 'closed'

export interface PanelData {
  id: PanelId
  status: PanelStatus
  zIndex: number
  position?: { x: number; y: number }
  scrollPosition?: number
  customState?: Record<string, any> // For panel-specific state (filters, search terms, etc.)
}

export interface PanelState {
  panels: Record<PanelId, PanelData>
  highestZIndex: number
  minimizedPanels: PanelId[]
}

export const initialPanelState: PanelState = {
  panels: {
    marketplace: {
      id: 'marketplace',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    feed: {
      id: 'feed',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    dashboard: {
      id: 'dashboard',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    profile: {
      id: 'profile',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    wallet: {
      id: 'wallet',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    settings: {
      id: 'settings',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    notifications: {
      id: 'notifications',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    messages: {
      id: 'messages',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    create: {
      id: 'create',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    discover: {
      id: 'discover',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    collections: {
      id: 'collections',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
    analytics: {
      id: 'analytics',
      status: 'closed',
      zIndex: 1,
      customState: {},
    },
  },
  highestZIndex: 1,
  minimizedPanels: [],
}

export const panelReducer = (state: PanelState, action: PanelAction): PanelState => {
  switch (action.type) {
    case PanelActionTypes.OPEN_PANEL: {
      const panelId = (action.payload as OpenPanelPayload).panelId
      const newZIndex = state.highestZIndex + 1

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            status: 'open',
            zIndex: newZIndex,
          },
        },
        highestZIndex: newZIndex,
        minimizedPanels: state.minimizedPanels.filter((id) => id !== panelId),
      }
    }

    case PanelActionTypes.CLOSE_PANEL: {
      const panelId = (action.payload as ClosePanelPayload).panelId

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            status: 'closed',
          },
        },
        minimizedPanels: state.minimizedPanels.filter((id) => id !== panelId),
      }
    }

    case PanelActionTypes.MINIMIZE_PANEL: {
      const panelId = (action.payload as MinimizePanelPayload).panelId
      const alreadyMinimized = state.minimizedPanels.includes(panelId)

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            status: 'minimized',
          },
        },
        minimizedPanels: alreadyMinimized ? state.minimizedPanels : [...state.minimizedPanels, panelId],
      }
    }

    case PanelActionTypes.MAXIMIZE_PANEL: {
      const panelId = (action.payload as MaximizePanelPayload).panelId
      const newZIndex = state.highestZIndex + 1

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            status: 'open',
            zIndex: newZIndex,
          },
        },
        highestZIndex: newZIndex,
        minimizedPanels: state.minimizedPanels.filter((id) => id !== panelId),
      }
    }

    case PanelActionTypes.TOGGLE_PANEL: {
      const panelId = (action.payload as TogglePanelPayload).panelId
      const currentStatus = state.panels[panelId].status

      if (currentStatus === 'closed') {
        const newZIndex = state.highestZIndex + 1
        return {
          ...state,
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              status: 'open',
              zIndex: newZIndex,
            },
          },
          highestZIndex: newZIndex,
        }
      } else {
        return {
          ...state,
          panels: {
            ...state.panels,
            [panelId]: {
              ...state.panels[panelId],
              status: 'closed',
            },
          },
          minimizedPanels: state.minimizedPanels.filter((id) => id !== panelId),
        }
      }
    }

    case PanelActionTypes.SET_PANEL_POSITION: {
      const { panelId, position } = action.payload as SetPanelPositionPayload

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            position,
          },
        },
      }
    }

    case PanelActionTypes.SET_PANEL_SCROLL: {
      const { panelId, scrollPosition } = action.payload as SetPanelScrollPayload

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            scrollPosition,
          },
        },
      }
    }

    case PanelActionTypes.BRING_TO_FRONT: {
      const panelId = (action.payload as BringToFrontPayload).panelId
      const newZIndex = state.highestZIndex + 1

      return {
        ...state,
        panels: {
          ...state.panels,
          [panelId]: {
            ...state.panels[panelId],
            zIndex: newZIndex,
          },
        },
        highestZIndex: newZIndex,
      }
    }

    case PanelActionTypes.CLOSE_ALL_PANELS: {
      const updatedPanels = Object.keys(state.panels).reduce(
        (acc, key) => {
          const panelId = key as PanelId
          acc[panelId] = {
            ...state.panels[panelId],
            status: 'closed',
          }
          return acc
        },
        {} as Record<PanelId, PanelData>
      )

      return {
        ...state,
        panels: updatedPanels,
        minimizedPanels: [],
      }
    }

    default:
      return state
  }
}
