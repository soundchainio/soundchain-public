import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

const topNavBarProps: TopNavBarProps = {
  title: 'Social Links',
  leftButton: <BackButton />,
  rightButton: <SkipButton href="/create-account/security" />,
  subtitle: <StepProgressBar steps={steps} currentStep={6} />,
};

export default function SocialLinksPage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);
  }, [setHideBottomNavBar, setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Social Links | SoundChain"
        canonicalUrl="/create-account/social-links"
        description="SoundChain Social Links"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 bg-gray-20 py-6">
        <SocialLinksForm
          afterSubmit={() => router.push('/create-account/security')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  );
}
