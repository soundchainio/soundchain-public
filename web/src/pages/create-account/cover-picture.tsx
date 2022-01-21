import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { steps, SkipButton } from 'utils/createAccountUtils';

export default function CoverPicturePage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Cover Photo',
    leftButton: <BackButton />,
    rightButton: <SkipButton href="/create-account/favorite-genres" />,
    subtitle: <StepProgressBar steps={steps} currentStep={2} />,
  };

  return (
    <>
      <SEO
        title="Soundchain - Cover Picture"
        canonicalUrl="/create-account/cover-picture"
        description="Soundchain Cover Picture"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <Head>
          <title>Soundchain - Cover Picture</title>
          <meta name="description" content="Cover Picture" />
          <link rel="icon" href="/favicons/favicon.ico" />
        </Head>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <CoverPictureForm
            afterSubmit={() => router.push('/create-account/favorite-genres')}
            submitText="NEXT"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </Layout>
    </>
  );
}
