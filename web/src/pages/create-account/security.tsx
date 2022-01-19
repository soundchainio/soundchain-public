import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { SecurityForm } from 'components/forms/profile/SecurityForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { config } from 'config';
import { useRouter } from 'next/router';
import React from 'react';

export default function SecurityPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Two-factor Security',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push(`${config.redirectUrlPostLogin}`)} selected={false} />,
    subtitle: <StepProgressBar steps={7} currentStep={7} />,
  };

  return (
    <>
      <SEO
        title="Soundchain - Security"
        canonicalUrl="/create-account/social-links"
        description="Soundchain Security"
      />
      <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
        <SEO title="Soundchain - Security" canonicalUrl="/settings/security/" description="Soundchain Security" />
        <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
          <SecurityForm afterSubmit={() => router.push(`${config.redirectUrlPostLogin}`)} />
        </div>
      </Layout>
    </>
  );
}
