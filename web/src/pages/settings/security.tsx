import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMe } from 'hooks/useMe';
import { BackButton } from 'components/Buttons/BackButton';
import { DisableRecoveryForm } from 'components/forms/profile/DisableSecurityForm';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';

const topNavBarProps: TopNavBarProps = {
  title: 'Two-factor Security',
  leftButton: <BackButton />,
};

export default function CoverPicturePage() {
  const router = useRouter();
  const me = useMe();

  const handleAfterSubmit = () => router.push('/settings');

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Security</title>
        <meta name="description" content="Security" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
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
