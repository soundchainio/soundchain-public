import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Genres',

  rightButton: <SkipButton href="/create-account/musician-type" />,
  subtitle: <StepProgressBar steps={steps} currentStep={3} />,
};

export default function FavoriteGenresPage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);
  }, [setHideBottomNavBar, setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Favorite Genres | SoundChain"
        canonicalUrl="/create-account/favorite-genres"
        description="SoundChain Favorite Genres"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <FavoriteGenresForm
            afterSubmit={() => router.push('/create-account/musician-type')}
            submitText="NEXT"
            submitProps={{ borderColor: 'bg-blue-gradient' }}
          />
        </div>
      </div>
    </>
  );
}
