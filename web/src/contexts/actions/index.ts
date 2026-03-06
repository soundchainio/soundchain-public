import { Payloads } from 'contexts/payloads'
import { ModalActionTypes } from './modal'
import { PanelActionTypes } from './panel'

export type ActionTypes = ModalActionTypes | PanelActionTypes

export interface Action {
  type: ActionTypes
  payload: Payloads
}
