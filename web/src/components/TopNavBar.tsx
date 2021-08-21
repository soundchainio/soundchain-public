import { MenuIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { Button } from './Button';
import { Title } from './Title';

interface TopNavBarProps {
  rightButton?: ReactNode;
  title?: string;
}

export const TopNavBar = ({ title, rightButton }: TopNavBarProps) => {
  const router = useRouter();
  const me = useMe();

  return (
    <nav className="bg-gray-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex flex-row items-center h-16">
          <div
            className={classNames(
              me && !rightButton && 'absolute inset-y-0 left-0',
              'flex items-center sm:hidden',
              rightButton && 'flex-1',
            )}
          >
            <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <span className="sr-only">Open main menu</span>
              <MenuIcon className="block h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {me ? (
            <div className="flex-2 flex items-center justify-center md:items-stretch md:justify-start">
              <div className="flex-shrink-0 flex items-center">
                {title ? (
                  <Title navTitle className="text-sm text-center md:text-left">
                    {title}
                  </Title>
                ) : (
                  <Logo className="block h-8 w-auto" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-2 flex items-start sm:items-stretch justify-start">
              <div className="flex-shrink-0 flex items-center">
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Login
                </Button>
                <Button variant="outline" onClick={() => router.push('/create-account')}>
                  Create Account
                </Button>
              </div>
            </div>
          )}
          {rightButton && <div className="flex flex-1 justify-end pr-2">{rightButton}</div>}
        </div>
      </div>
    </nav>
  );
};
