import classNames from 'classnames';
import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar, TopNavBarProps } from 'components/TopNavBar';
import { store } from 'contexts';
import { ReactNode, useContext } from 'react';
import { DeleteModal } from './DeleteModal';
import { NewPostModal } from './NewPostModal';

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
  hideBottomNavBar?: boolean;
}

export const Layout = ({ children, hideBottomNavBar, topNavBarProps }: LayoutProps) => {
  const { state } = useContext(store);

  return (
    <div className="min-h-screen flex flex-col bg-gray-10">
      <div className={classNames('fixed top-0 w-full z-10')}>
        {!state?.modal.anyModalOpened && <TopNavBar {...topNavBarProps} />}
        <div id="top-sheet"></div>
      </div>
      <div className="pb-20 pt-16">{children}</div>
      <div className="fixed bottom-0 w-full">
        <div id="bottom-sheet"></div>
        {!state?.modal.anyModalOpened && !hideBottomNavBar && <BottomNavBar />}
        <div id="modals">
          <NewPostModal />
          <DeleteModal />
        </div>
      </div>
    </div>
  );
};
