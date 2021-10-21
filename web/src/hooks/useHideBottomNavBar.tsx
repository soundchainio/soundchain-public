import { createContext, ReactNode, useContext, useState } from 'react';

interface HideBottomNavBarContextData {
  hideBottomNavBar: boolean;
  setHideBottomNavBarState: (value: boolean) => void;
  isMinting: boolean;
  setIsMintingState: (value: boolean) => void;
}

const HideBottomNavBarContext = createContext<HideBottomNavBarContextData>({
  hideBottomNavBar: false,
  isMinting: false,
} as HideBottomNavBarContextData);

interface HideBottomNavBarProviderProps {
  children: ReactNode;
}

export function HideBottomNavBarProvider({ children }: HideBottomNavBarProviderProps) {
  const [hideBottomNavBar, setHideBottomNavBar] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const setHideBottomNavBarState = (value: boolean) => {
    setHideBottomNavBar(value);
  };

  const setIsMintingState = (value: boolean) => {
    setIsMinting(value);
  };

  return (
    <HideBottomNavBarContext.Provider
      value={{
        hideBottomNavBar,
        setHideBottomNavBarState,
        isMinting,
        setIsMintingState
      }}
    >
      {children}
    </HideBottomNavBarContext.Provider>
  );
}

export const useHideBottomNavBar = () => useContext(HideBottomNavBarContext);
