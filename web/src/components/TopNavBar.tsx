import { MenuIcon } from '@heroicons/react/outline';
import { useMe } from 'hooks/useMe';
import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { Button } from './Button';

export const TopNavBar = () => {
  const router = useRouter();
  const me = useMe();

  return (
    <nav className="bg-gray-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className={`${me && 'absolute inset-y-0 left-0'} flex items-center sm:hidden`}>
            <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <span className="sr-only">Open main menu</span>
              <MenuIcon className="block h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          {me ? (
            <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex-shrink-0 flex items-center">
                <Logo className="block h-8 w-auto" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-start sm:items-stretch justify-start">
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
        </div>
      </div>
    </nav>
  );
};
