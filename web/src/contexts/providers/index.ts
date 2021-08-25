import { useContext } from 'react';
import { store } from '..';

export const useDispatch = () => {
  const { dispatch } = useContext(store);
  return dispatch;
};
