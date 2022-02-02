import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

export default function SocialLinksPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Social Links',
    leftButton: <BackButton />,
    rightButton: <SkipButton href="/create-account/security" />,
    subtitle: <StepProgressBar steps={steps} currentStep={6} />,
  };

  return (
    <>
      <SEO
        title="Social Links | SoundChain"
        canonicalUrl="/create-account/social-links"
        description="SoundChain Social Links"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <SocialLinksForm
            afterSubmit={() => router.push('/create-account/security')}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </Layout>
    </>
  );
}
