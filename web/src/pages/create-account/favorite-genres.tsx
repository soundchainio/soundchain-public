import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

export default function FavoriteGenresPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Favorite Genres',
    leftButton: <BackButton />,
    rightButton: <SkipButton href="/create-account/musician-type" />,
    subtitle: <StepProgressBar steps={steps} currentStep={3} />,
  };

  return (
    <>
      <SEO
        title="Favorite Genres | SoundChain"
        canonicalUrl="/create-account/favorite-genres"
        description="SoundChain Favorite Genres"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
          <div className="flex flex-1 flex-col space-y-6">
            <FavoriteGenresForm
              afterSubmit={() => router.push('/create-account/musician-type')}
              submitText="NEXT"
              submitProps={{ borderColor: 'bg-blue-gradient' }}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}
