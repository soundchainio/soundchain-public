import { Payloads } from 'contexts/payloads'
import { ModalActionTypes } from './modal'

export type ActionTypes = ModalActionTypes

export interface Action {
  type: ActionTypes
  payload: Payloads
}
