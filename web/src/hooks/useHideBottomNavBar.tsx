import { createContext, ReactNode, useContext, useState } from 'react';

interface HideBottomNavBarContextData {
  hideBottomNavBar: boolean;
  setHideBottomNavBarState: (value: boolean) => void;
}

const HideBottomNavBarContext = createContext<HideBottomNavBarContextData>({
  hideBottomNavBar: false,
} as HideBottomNavBarContextData);

interface HideBottomNavBarProviderProps {
  children: ReactNode;
}

export function HideBottomNavBarProvider({ children }: HideBottomNavBarProviderProps) {
  const [hideBottomNavBar, setHideBottomNavBar] = useState(false);

  const setHideBottomNavBarState = (value: boolean) => {
    setHideBottomNavBar(value);
  };

  return (
    <HideBottomNavBarContext.Provider
      value={{
        hideBottomNavBar,
        setHideBottomNavBarState,
      }}
    >
      {children}
    </HideBottomNavBarContext.Provider>
  );
}

export const useHideBottomNavBar = () => useContext(HideBottomNavBarContext);
