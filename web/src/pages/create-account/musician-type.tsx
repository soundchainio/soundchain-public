import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

export default function MusicianTypePage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Musician Type',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push('/')} selected={false} />,
    subtitle: <StepProgressBar steps={6} currentStep={4} />,
  };

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
            afterSubmit={() => router.push('/create-account/bio')}
            submitText="NEXT"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </div>
    </Layout>
  );
}
