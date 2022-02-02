import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

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
        title="Cover Picture | SoundChain"
        canonicalUrl="/create-account/cover-picture"
        description="SoundChain Cover Picture"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
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
