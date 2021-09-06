import { BottomNavBar } from 'components/BottomNavBar';
import { store } from 'contexts';
import { ReactNode, useContext, useState } from 'react';
import { DeleteModal } from './DeleteModal';
import { NewPostModal } from './NewPostModal';
import { SideMenu } from './SideMenu';
import { TopNavBar, TopNavBarProps } from './TopNavBar';

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
}

export const Layout = ({ children, hideBottomNavBar, topNavBarProps }: LayoutProps) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const { state } = useContext(store);

  return (
    <div className="h-screen flex overflow-hidden">
      <SideMenu isOpen={sideMenuOpen} setOpen={setSideMenuOpen} />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <TopNavBar setSideMenuOpen={setSideMenuOpen} {...topNavBarProps} />
        <div id="top-sheet"></div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-10">
          <div id="main" className="max-w-7xl mx-auto mb-20">
            {children}
          </div>
        </main>
        <div className="fixed bottom-0 w-full">
          <div id="bottom-sheet"></div>
          {!state?.modal.anyModalOpened && !hideBottomNavBar && <BottomNavBar />}
        </div>
      </div>
      <div id="modals" className="absolute z-20 w-full">
        <NewPostModal />
        <DeleteModal />
      </div>
    </div>
  );
};
