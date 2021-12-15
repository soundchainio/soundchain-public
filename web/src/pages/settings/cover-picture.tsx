import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Cover Picture',
  leftButton: <BackButton />,
};

export default function CoverPicturePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Cover Picture</title>
        <meta name="description" content="Cover Picture" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <CoverPictureForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
