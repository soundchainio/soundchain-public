import { BackButton } from 'components/Buttons/BackButton';
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Musician Type',
};

export default function MusicianTypePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Musician Type</title>
        <meta name="description" content="Musician Type" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypesForm
            afterSubmit={() => router.push('/settings')}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </div>
    </Layout>
  );
}
