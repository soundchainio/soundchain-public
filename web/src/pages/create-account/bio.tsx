import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { BioForm } from 'components/forms/profile/BioForm';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

export default function BioPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Bio',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push('/')} selected={false} />,
    subtitle: <StepProgressBar steps={5} currentStep={5} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Bio</title>
        <meta name="description" content="Bio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <BioForm
          afterSubmit={() => router.push('/')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </Layout>
  );
}
