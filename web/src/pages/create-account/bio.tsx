import { BackButton } from 'components/Buttons/BackButton';
import { BioForm } from 'components/forms/profile/BioForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { steps, SkipButton } from 'utils/createAccountUtils';

export default function BioPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Bio',
    leftButton: <BackButton />,
    rightButton: <SkipButton href="/create-account/social-links" />,
    subtitle: <StepProgressBar steps={steps} currentStep={5} />,
  };

  return (
    <>
      <SEO title="Soundchain - Bio" canonicalUrl="/create-account/bio" description="Soundchain Bio" />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <Head>
          <title>Soundchain - Bio</title>
          <meta name="description" content="Bio" />
          <link rel="icon" href="/favicons/favicon.ico" />
        </Head>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <BioForm
            afterSubmit={() => router.push('/create-account/social-links')}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </Layout>
    </>
  );
}
