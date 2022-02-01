import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { config } from 'config';
import { useRouter } from 'next/router';
import React from 'react';
import { steps, SkipButton } from 'utils/createAccountUtils';

export default function ProfilePicturePage() {
  const router = useRouter();

  const onClose = () => {
    router.push(`${config.redirectUrlPostLogin}`);
  };

  const topNavBarProps: TopNavBarProps = {
    title: 'Profile Picture',
    leftButton: (
      <div className="text-gray-400 font-bold flex-1 text-left" onClick={onClose}>
        Cancel
      </div>
    ),
    rightButton: <SkipButton href="/create-account/cover-picture" />,
    subtitle: <StepProgressBar steps={steps} currentStep={1} />,
  };

  return (
    <>
      <SEO
        title="Profile Picture | SoundChain"
        canonicalUrl="/create-account/profile-picture"
        description="SoundChain Profile Picture"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <ProfilePictureForm
            afterSubmit={() => router.push('/create-account/cover-picture')}
            submitText="NEXT"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </Layout>
    </>
  );
}
