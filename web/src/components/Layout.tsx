import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar, TopNavBarProps } from 'components/TopNavBar';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
}

export const Layout = ({ children, topNavBarProps }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-10">
      <div className="fixed top-0 w-full z-10">
        <TopNavBar title={topNavBarProps?.title} rightButton={topNavBarProps?.rightButton} />
        <div id="top-sheet"></div>
      </div>
      <div className="pb-20 pt-16">{children}</div>
      <div className="fixed bottom-0 w-full">
        <div id="bottom-sheet"></div>
        <div id="modals"></div>
        <BottomNavBar />
      </div>
    </div>
  );
};
