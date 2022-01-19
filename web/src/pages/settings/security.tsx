import { BackButton } from 'components/Buttons/BackButton';
import { DisableRecoveryForm } from 'components/forms/profile/DisableSecurityForm';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Two-factor Security',
  leftButton: <BackButton />,
};

export default function SecurityPage() {
  const router = useRouter();
  const me = useMe();

  const handleAfterSubmit = () => router.push('/settings');

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO title="Soundchain - Security" canonicalUrl="/settings/security/" description="Soundchain Security" />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        {!me?.otpSecret ? (
          <SecurityForm afterSubmit={handleAfterSubmit} />
        ) : (
          <DisableRecoveryForm afterSubmit={handleAfterSubmit} />
        )}
      </div>
    </Layout>
  );
}
