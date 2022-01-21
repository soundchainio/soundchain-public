import { BackButton } from 'components/Buttons/BackButton';
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';
import { steps, SkipButton } from 'utils/createAccountUtils';

export default function MusicianTypePage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Musician Type',
    leftButton: <BackButton />,
    rightButton: <SkipButton href="/create-account/bio" />,
    subtitle: <StepProgressBar steps={steps} currentStep={4} />,
  };

  return (
    <>
      <SEO
        title="Soundchain - Musician Type"
        canonicalUrl="/create-account/musician-type"
        description="Soundchain Musician Type"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
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
    </>
  );
}
