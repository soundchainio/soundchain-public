import classNames from 'classnames';
import { config } from 'config';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { Menu } from 'icons/Menu';
import { Profile } from 'icons/Profile';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from './Button';
import { NavBar } from './NavBar';
import { Title } from './Title';
import { TopNavBarButton } from './TopNavBarButton';

export interface TopNavBarProps {
  setSideMenuOpen?: (open: boolean) => void;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
  showLoginSignUpButton?: boolean;
  title?: string;
  subtitle?: JSX.Element;
  midRightButton?: JSX.Element;
  isLogin?: boolean;
}

export const TopNavBar = ({
  title,
  rightButton: RightButton,
  leftButton: LeftButton,
  subtitle: Subtitle,
  showLoginSignUpButton = true,
  setSideMenuOpen,
  midRightButton,
  isLogin,
}: TopNavBarProps) => {
  const router = useRouter();
  const me = useMe();

  const onLogin = () => {
    router.push('/login');
  };

  if (isLogin) return null;

  return (
    <div className={`relative z-10 flex-shrink-0 flex h-16 bg-black ${config.mobileBreakpoint}:bg-gray-30 shadow`}>
      <div
        className={classNames(
          `text-gray-80 ${config.mobileBreakpoint}:hidden items-center h-full pl-4 flex-grow-basis-0`,
          me && !RightButton && 'absolute left-0 justify-center',
          (RightButton || midRightButton) && 'flex-1',
        )}
      >
        <div className="h-full flex flex-1 items-center justify-start gap-2">
          {LeftButton ? (
            LeftButton
          ) : (
            <>
              <TopNavBarButton icon={Menu} label="Menu" onClick={() => setSideMenuOpen && setSideMenuOpen(true)} />
              {me && (
                <TopNavBarButton icon={Profile} label="Profile" path={`/profiles/${me.handle}`} color="pink-blue" />
              )}
            </>
          )}
        </div>
      </div>
      {me && !midRightButton ? (
        <>
          <div
            className={`${config.mobileBreakpoint}:hidden flex-2 flex-grow-basis flex items-center justify-center ${config.mobileBreakpoint}:items-stretch ${config.mobileBreakpoint}:justify-start truncate`}
          >
            <div className="flex-shrink-0 flex items-center w-full justify-center">
              {title ? (
                <div className="flex flex-col w-full">
                  <Title navTitle className={`text-sm text-center ${config.mobileBreakpoint}:text-left truncate`}>
                    {title}
                  </Title>
                  {Subtitle}
                </div>
              ) : (
                <Link href="/" passHref>
                  <a aria-label="Home">
                    <Logo className="block h-8 w-auto" />
                  </a>
                </Link>
              )}
            </div>
          </div>
          <div
            className={`hidden w-full ${config.mobileBreakpoint}:flex flex-2 items-center justify-center ${config.mobileBreakpoint}:items-stretch ${config.mobileBreakpoint}:justify-start`}
          >
            <div className="flex items-center w-full">
              <NavBar />
            </div>
          </div>
        </>
      ) : (
        showLoginSignUpButton &&
        !midRightButton && (
          <div className="flex-2 flex items-center justify-start ml-4 space-x-2 ">
            <Button
              variant={router.pathname === '/login' ? 'rainbow-xs' : 'outline'}
              onClick={onLogin}
              className="w-32 h-8 bg-opacity-70"
              borderColor="bg-gray-40"
              bgColor="bg-black"
            >
              Login in / Sign up
            </Button>
          </div>
        )
      )}
      {RightButton && !midRightButton && (
        <div className={`flex flex-1 ${config.mobileBreakpoint}:flex-none justify-end pr-4 items-center flex-shrink-0`}>
          {RightButton}
        </div>
      )}
      {midRightButton && (
        <div className="flex flex-1 justify-left pl-28 items-center flex-shrink-0">{midRightButton}</div>
      )}
    </div>
  );
};
