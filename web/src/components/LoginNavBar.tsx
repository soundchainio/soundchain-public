import { LoginIcon, UserAddIcon } from '@heroicons/react/outline';
import { TabNav } from 'components/TabNav';
import { useRouter } from 'next/router';

export const LoginNavBar = () => {
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
      href: '/create-account',
      current: ['/create-account'].includes(router.asPath),
      icon: UserAddIcon,
    },
  ];

  return <>{navTabs.some(tab => tab.current) && <TabNav tabs={navTabs} className="text-xs" />}</>;
};
