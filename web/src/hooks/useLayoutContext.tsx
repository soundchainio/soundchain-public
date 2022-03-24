import { TopNavBarProps } from 'components/TopNavBar';
import { createContext, ReactNode, useContext, useState } from 'react';

interface LayoutContextData {
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
  isAuthLayout?: boolean;
  isLandingLayout?: boolean;
  setHideBottomNavBar: (value: boolean) => void;
  setTopNavBarProps: (value: TopNavBarProps) => void;
  setIsAuthLayout: (value: boolean) => void;
  setIsLandingLayout: (value: boolean) => void;
}

const LayoutContext = createContext<LayoutContextData>({} as LayoutContextData);

interface LayoutContextProviderProps {
  children: ReactNode;
}

export function LayoutContextProvider({ children }: LayoutContextProviderProps) {
  const [hideBottomNavBar, setHideBottomNavBar] = useState(false);
  const [isAuthLayout, setIsAuthLayout] = useState(false);
  const [isLandingLayout, setIsLandingLayout] = useState(false);
  const [topNavBarProps, setTopNavBarProps] = useState<TopNavBarProps>({});

  return (
    <LayoutContext.Provider
      value={{
        topNavBarProps,
        hideBottomNavBar,
        isAuthLayout,
        isLandingLayout,
        setHideBottomNavBar,
        setTopNavBarProps,
        setIsAuthLayout,
        setIsLandingLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayoutContext = () => useContext(LayoutContext);
