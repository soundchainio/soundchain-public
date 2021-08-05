import { LoginIcon, UserAddIcon } from '@heroicons/react/outline';
import { LockedLayout } from 'components/LockedLayout';
import { RegisterForm } from 'components/RegisterForm';
import { TabNav } from 'components/TabNav';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/dist/client/router';
import React, { useEffect } from 'react';

const navTabs = [
  {
    name: 'Login',
    href: '/login',
    current: false,
    icon: LoginIcon,
  },
  {
    name: 'Create Account',
    href: '/register',
    current: true,
    icon: UserAddIcon,
  },
];

export default function SignUpPage() {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/complete-profile');
    }
  }, [me, router]);

  return (
    <LockedLayout>
      <TabNav tabs={navTabs} />
      <RegisterForm />
    </LockedLayout>
  );
}
