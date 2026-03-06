import { PanelId } from 'contexts/reducers/panel'

export interface OpenPanelPayload {
  panelId: PanelId
}

export interface ClosePanelPayload {
  panelId: PanelId
}

export interface MinimizePanelPayload {
  panelId: PanelId
}

export interface MaximizePanelPayload {
  panelId: PanelId
}

export interface TogglePanelPayload {
  panelId: PanelId
}

export interface SetPanelPositionPayload {
  panelId: PanelId
  position: { x: number; y: number }
}

export interface SetPanelScrollPayload {
  panelId: PanelId
  scrollPosition: number
}

export interface BringToFrontPayload {
  panelId: PanelId
}

export interface CloseAllPanelsPayload {}

export type PanelPayload =
  | OpenPanelPayload
  | ClosePanelPayload
  | MinimizePanelPayload
  | MaximizePanelPayload
  | TogglePanelPayload
  | SetPanelPositionPayload
  | SetPanelScrollPayload
  | BringToFrontPayload
  | CloseAllPanelsPayload
