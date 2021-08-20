import { createContext, useContext } from 'react';

type ModalsContextType = {
  anyModalOpened: boolean;
  setAnyModalOpened: (val: boolean) => void;
};

export const ModalsContext = createContext<ModalsContextType>({
  anyModalOpened: false,
  setAnyModalOpened: () => {},
});

export const useModalsContext = () => useContext(ModalsContext);
