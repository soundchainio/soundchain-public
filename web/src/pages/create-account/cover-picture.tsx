import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

const topNavBarProps: TopNavBarProps = {
  title: 'Cover Photo',

  rightButton: <SkipButton href="/create-account/favorite-genres" />,
  subtitle: <StepProgressBar steps={steps} currentStep={2} />,
};

export default function CoverPicturePage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);
  }, [setHideBottomNavBar, setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Cover Picture | SoundChain"
        canonicalUrl="/create-account/cover-picture"
        description="SoundChain Cover Picture"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <CoverPictureForm
          afterSubmit={() => router.push('/create-account/favorite-genres')}
          submitText="NEXT"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </>
  );
}
