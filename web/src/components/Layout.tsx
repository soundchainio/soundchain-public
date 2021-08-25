import { BottomNavBar } from 'components/BottomNavBar';
import { TopNavBar } from 'components/TopNavBar';
import { ReactNode } from 'react';

interface LayoutProps {
  title?: string;
  children: ReactNode;
  topRightButton?: ReactNode;
}

export const Layout = ({ children, title, topRightButton }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-10">
      <div className="fixed top-0 w-full z-10">
        <TopNavBar title={title} rightButton={topRightButton} />
        <div id="top-sheet"></div>
      </div>
      <div className="pb-20 pt-16">{children}</div>
      <div className="fixed bottom-0 w-full">
        <div id="bottom-sheet"></div>
        <BottomNavBar />
      </div>
    </div>
  );
};
