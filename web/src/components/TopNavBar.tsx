import classNames from 'classnames';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { Menu } from 'icons/Menu';
import { useRouter } from 'next/router';
import { Button } from './Button';
import { Title } from './Title';
import { TopNavBarButton } from './TopNavBarButton';

export interface TopNavBarProps {
  setSideMenuOpen?: (open: boolean) => void;
  leftButton?: () => JSX.Element;
  rightButton?: () => JSX.Element;
  title?: string;
}

export const TopNavBar = ({
  title,
  rightButton: RightButton,
  leftButton: LeftButton,
  setSideMenuOpen,
}: TopNavBarProps) => {
  const router = useRouter();
  const me = useMe();

  const onLogin = () => {
    router.push('/login');
  };

  const onCreateAccount = () => {
    router.push('/create-account');
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-black shadow">
      <button
        type="button"
        className={classNames(
          'text-gray-80 md:hidden items-center h-full pl-4',
          me && !RightButton && 'absolute left-0 justify-center',
          RightButton && 'flex-1',
        )}
      >
        <div className="flex flex-1 justify-start">
          {LeftButton ? (
            <LeftButton />
          ) : (
            <TopNavBarButton icon={Menu} label="Menu" onClick={() => setSideMenuOpen && setSideMenuOpen(true)} />
          )}
        </div>
      </button>
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
        <div className="flex-2 flex items-stretch justify-start ml-2">
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
        <div className="flex flex-1 justify-end pr-4 items-center">
          <RightButton />
        </div>
      )}
    </div>
  );
};
