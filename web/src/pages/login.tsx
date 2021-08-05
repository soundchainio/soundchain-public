import { LoginIcon, UserAddIcon } from '@heroicons/react/outline';
import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import { TabNav } from 'components/TabNav';

const navTabs = [
  {
    name: 'Login',
    href: '/login',
    current: true,
    icon: LoginIcon,
  },
  {
    name: 'Create Account',
    href: '/register',
    current: false,
    icon: UserAddIcon,
  },
];

export default function LoginPage() {
  return (
    <LockedLayout>
      <TabNav tabs={navTabs} />
      <LoginForm />
    </LockedLayout>
  );
}
