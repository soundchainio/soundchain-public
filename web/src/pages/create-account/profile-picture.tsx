import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
import NextLink from 'next/link';
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
        <NextLink href={config.redirectUrlPostLogin}>
          <a className="text-gray-400 font-bold flex-1 text-left">Cancel</a>
        </NextLink>
      ),
      rightButton: <SkipButton href="/create-account/cover-picture" />,
      subtitle: <StepProgressBar steps={steps} currentStep={1} />,
    }),
    [],
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
