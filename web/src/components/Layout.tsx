import classNames from 'classnames';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import { ReactNode, useEffect, useState } from 'react';
import { AuthorActionsModal } from './AuthorActionsModal';
import { ApproveModal } from './modals/ApproveModal';
import { PostModal } from './PostModal';
import { ReactionsModal } from './ReactionsModal';
import { RemoveListingConfirmationModal } from './RemoveListingConfirmationModal';
import { SideMenu } from './SideMenu';
import { TopNavBar, TopNavBarProps } from './TopNavBar';
import { TransferConfirmationModal } from './TransferConfirmationModal';
import { UnderDevelopmentModal } from './UnderDevelopmentModal';

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
  className?: string;
}

export const Layout = ({ children, hideBottomNavBar, topNavBarProps, className }: LayoutProps) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const { setHideBottomNavBarState } = useHideBottomNavBar();

  useEffect(() => {
    setHideBottomNavBarState(!!hideBottomNavBar);
  }, [hideBottomNavBar, setHideBottomNavBarState]);

  return (
    <div className="h-full flex-1 flex overflow-hidden">
      <SideMenu isOpen={sideMenuOpen} setOpen={setSideMenuOpen} />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <TopNavBar setSideMenuOpen={setSideMenuOpen} {...topNavBarProps} />
        <div id="top-sheet"></div>
        <main id="main" className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-10">
          <div className={classNames('max-w-7xl mx-auto h-full', className)}>{children}</div>
        </main>
      </div>
      <div id="modals" className="absolute z-20 w-full">
        <UnderDevelopmentModal />
        <PostModal />
        <AuthorActionsModal />
        <ReactionsModal />
        <TransferConfirmationModal />
        <ApproveModal />
        <RemoveListingConfirmationModal />
      </div>
    </div>
  );
};
