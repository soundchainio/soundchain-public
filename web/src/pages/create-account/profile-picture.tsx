import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo } from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

export default function ProfilePicturePage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  const topNavBarProps: TopNavBarProps = useMemo(
    () => ({
      title: 'Profile Picture',
      leftButton: (
        <div
          className="text-gray-400 font-bold flex-1 text-left"
          onClick={() => {
            router.push(`${config.redirectUrlPostLogin}`);
          }}
        >
          Cancel
        </div>
      ),
      rightButton: <SkipButton href="/create-account/cover-picture" />,
      subtitle: <StepProgressBar steps={steps} currentStep={1} />,
    }),
    [router],
  );

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);
  }, [setHideBottomNavBar, setTopNavBarProps, topNavBarProps]);

  return (
    <>
      <SEO
        title="Profile Picture | SoundChain"
        canonicalUrl="/create-account/profile-picture"
        description="SoundChain Profile Picture"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <ProfilePictureForm
          afterSubmit={() => router.push('/create-account/cover-picture')}
          submitText="NEXT"
          submitProps={{ borderColor: 'bg-blue-gradient' }}
        />
      </div>
    </>
  );
}
