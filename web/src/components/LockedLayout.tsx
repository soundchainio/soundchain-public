import { LoginIcon, UserAddIcon } from '@heroicons/react/outline';
import { TabNav } from 'components/TabNav';
import { useRouter } from 'next/router';

export const LockedLayout: React.FC = ({ children }) => {
  const router = useRouter();
  const navTabs = [
    {
      name: 'Login',
      href: '/login',
      current: ['/login'].includes(router.asPath),
      icon: LoginIcon,
    },
    {
      name: 'Create Account',
      href: '/register',
      current: ['/register', '/complete-profile'].includes(router.asPath),
      icon: UserAddIcon,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col sm:justify-center sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:block sm:mx-auto sm:w-full sm:max-w-lg py-4 sm:py-8 px-4 sm:px-10 space-y-12">
        {navTabs.some(tab => tab.current) && <TabNav tabs={navTabs} className="text-xs" />}
        {children}
      </div>
    </div>
  );
};
