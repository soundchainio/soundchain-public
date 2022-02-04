import { BackButton } from 'components/Buttons/BackButton';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { config } from 'config';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { SkipButton, steps } from 'utils/createAccountUtils';

const topNavBarProps: TopNavBarProps = {
  title: 'Two-factor Security',
  leftButton: <BackButton />,
  rightButton: <SkipButton href={`${config.redirectUrlPostLogin}`} />,
  subtitle: <StepProgressBar steps={steps} currentStep={7} />,
};

export default function SecurityPage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);
  }, [setHideBottomNavBar, setTopNavBarProps]);

  return (
    <>
      <SEO title="Security | SoundChain" canonicalUrl="/settings/security/" description="SoundChain Security" />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <SecurityForm afterSubmit={() => router.push(`${config.redirectUrlPostLogin}`)} />
      </div>
    </>
  );
}
