import { ActionTypes, Payloads } from 'contexts';

export interface Action {
  type: ActionTypes;
  payload: Payloads;
}
