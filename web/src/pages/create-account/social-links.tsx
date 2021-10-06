import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import { Layout } from 'components/Layout';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

export default function SocialLinksPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Social Links',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push('/')} selected={false} />,
    subtitle: <StepProgressBar steps={6} currentStep={6} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Social Links</title>
        <meta name="description" content="Social Links" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <SocialLinksForm
          afterSubmit={() => router.push('/')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
