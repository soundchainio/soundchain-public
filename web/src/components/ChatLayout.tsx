import { ReactNode } from 'react';
import { TopNavBar, TopNavBarProps } from './TopNavBar';

interface LayoutMenuProps {
  children: ReactNode;
  topNavBarProps?: TopNavBarProps;
}

export const ChatLayout = ({ children, topNavBarProps }: LayoutMenuProps) => {
  return (
    <div className="h-full flex">
      <div className="flex flex-col w-0 flex-1 ">
        <div className="fixed top-0 w-full z-10">
          <TopNavBar {...topNavBarProps} />
        </div>
        <main className="flex-1 relative focus:outline-none bg-gray-10">
          <div id="main" className="max-w-7xl mx-auto pt-16 pb-14">
            {children}
          </div>
        </main>
        <div className="fixed bottom-0 w-full">
          <div id="bottom-sheet"></div>
        </div>
      </div>
    </div>
  );
};
