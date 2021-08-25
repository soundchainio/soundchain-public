import { LoginIcon, UserAddIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { Button } from './Button';

const loginPaths = ['/login', '/forgot-password', '/reset-password'];
const signupPaths = ['/create-account'];

export const AuthNavBar = () => {
  const router = useRouter();
  const loginActive = loginPaths.includes(router.pathname);
  const signupActive = signupPaths.includes(router.pathname);

  if (!loginActive && !signupActive) return <></>;

  return (
    <nav className="flex text-xs mb-6" aria-label="Tabs">
      <div onClick={() => router.push('/login')} className="w-full">
        {loginActive ? (
          <Button icon={LoginIcon} variant="rainbow-xs" className="w-full">
            Login
          </Button>
        ) : (
          <div className="flex flex-row uppercase items-center justify-center sm:px-3 py-3 font-medium text-gray-400 bg-gray-30 cursor-pointer w-full h-8">
            <LoginIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Login</span>
          </div>
        )}
      </div>
      <div onClick={() => router.push('/create-account')} className="w-full">
        {signupActive ? (
          <Button icon={UserAddIcon} variant="rainbow-xs" className="w-full">
            Create Account
          </Button>
        ) : (
          <div className="flex flex-row uppercase items-center justify-center sm:px-3 py-3 font-medium text-gray-400 bg-gray-30 cursor-pointer w-full h-8">
            <UserAddIcon className="mr-1 h-4 w-4" aria-hidden="true" />
            <span>Create Account</span>
          </div>
        )}
      </div>
    </nav>
  );
};
