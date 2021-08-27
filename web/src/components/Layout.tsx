import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar, TopNavBarProps } from 'components/TopNavBar';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
}

export const Layout = ({ children, hideBottomNavBar, topNavBarProps }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-10">
      <div className="fixed top-0 w-full z-10">
        <TopNavBar {...topNavBarProps} />
        <div id="top-sheet"></div>
      </div>
      <div className="pb-20 pt-16">{children}</div>
      <div className="fixed bottom-0 w-full">
        <div id="bottom-sheet"></div>
        {!hideBottomNavBar && <BottomNavBar />}
        <div id="modals"></div>
      </div>
    </div>
  );
};
