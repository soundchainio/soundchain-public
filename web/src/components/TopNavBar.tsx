import { MenuIcon } from '@heroicons/react/outline';
import classNames from 'classnames';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { Button } from './Button';
import { Title } from './Title';

export interface TopNavBarProps {
  leftButton?: () => JSX.Element;
  rightButton?: () => JSX.Element;
  title?: string;
}

export const TopNavBar = ({ title, rightButton: RightButton, leftButton: LeftButton }: TopNavBarProps) => {
  const router = useRouter();
  const me = useMe();

  const onLogin = () => {
    router.push('/login');
  };

  const onCreateAccount = () => {
    router.push('/create-account');
  };

  return (
    <nav className="bg-black">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex flex-row items-center h-16">
          <div
            className={classNames(
              'flex items-center sm:hidden',
              me && !RightButton && 'absolute left-0',
              RightButton && 'flex-1',
            )}
          >
            <button className="inline-flex items-center justify-center p-2">
              {LeftButton ? (
                <LeftButton />
              ) : (
                <>
                  <span className="sr-only">Open main menu</span>
                  <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                </>
              )}
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
                <Button variant="outline" onClick={onLogin}>
                  Login
                </Button>
                <Button variant="outline" onClick={onCreateAccount}>
                  Create Account
                </Button>
              </div>
            </div>
          )}
          {RightButton && (
            <div className="flex flex-1 justify-end pr-2">
              <RightButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
