import { BottomNavBar } from 'components/BottomNavBar';
import { ReactNode, useState } from 'react';
import { SideMenu } from './SideMenu';
import { TopNavBar, TopNavBarProps } from './TopNavBar';

interface LayoutMenuProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
}

export const LayoutMenu = ({ children, topNavBarProps, hideBottomNavBar }: LayoutMenuProps) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden ">
      <SideMenu isOpen={sideMenuOpen} setOpen={setSideMenuOpen} />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <TopNavBar setSideMenuOpen={setSideMenuOpen} {...topNavBarProps} />
        <div id="top-sheet"></div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-10">
          <div className="max-w-7xl mx-auto pb-14">{children}</div>
        </main>
        <div className="fixed bottom-0 w-full">
          <div id="bottom-sheet"></div>
          {!hideBottomNavBar && <BottomNavBar />}
          <div id="modals"></div>
        </div>
      </div>
    </div>
  );
};
