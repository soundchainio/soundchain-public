import { BackButton } from 'components/Buttons/BackButton';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: '2FA Security',
  leftButton: <BackButton />,
};

export default function CoverPicturePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Security</title>
        <meta name="description" content="Security" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <SecurityForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
