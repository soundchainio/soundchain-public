import { ReactNode } from 'react';
import { TopNavBar, TopNavBarProps } from './TopNavBar';

interface AuthLayoutProps {
  topNavBarProps?: TopNavBarProps;
  children: ReactNode;
}

export const AuthLayout = ({ children, topNavBarProps }: AuthLayoutProps) => {
  return (
    <div className="h-full flex flex-col bg-gray-20 pb-6">
      <TopNavBar {...topNavBarProps} />
      <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-gray-20 px-6 lg:px-8 pt-6">
        {children}
      </div>
    </div>
  );
};
