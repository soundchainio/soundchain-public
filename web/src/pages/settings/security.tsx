import { BackButton } from 'components/Buttons/BackButton';
import { DisableRecoveryForm } from 'components/forms/profile/DisableSecurityForm';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Two-factor Security',
  leftButton: <BackButton />,
};

export default function SecurityPage() {
  const router = useRouter();
  const me = useMe();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);

    return () => {
      setHideBottomNavBar(false);
    };
  }, [setHideBottomNavBar, setTopNavBarProps]);

  const handleAfterSubmit = () => router.push('/settings');

  return (
    <>
      <SEO title="Security | SoundChain" canonicalUrl="/settings/security/" description="SoundChain Security" />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        {!me?.otpSecret ? (
          <SecurityForm afterSubmit={handleAfterSubmit} />
        ) : (
          <DisableRecoveryForm afterSubmit={handleAfterSubmit} />
        )}
      </div>
    </>
  );
}
