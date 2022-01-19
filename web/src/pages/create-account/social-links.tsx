import { Badge } from 'components/Badge';
import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { StepProgressBar } from 'components/StepProgressBar';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';

export default function SocialLinksPage() {
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Social Links',
    leftButton: <BackButton />,
    rightButton: <Badge label="Skip" onClick={() => router.push('/create-account/security')} selected={false} />,
    subtitle: <StepProgressBar steps={7} currentStep={6} />,
  };

  return (
    <>
      <SEO
        title="Soundchain - Social Links"
        canonicalUrl="/create-account/social-links"
        description="Soundchain Social Links"
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
