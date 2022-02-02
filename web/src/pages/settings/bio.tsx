import { BackButton } from 'components/Buttons/BackButton';
import { BioForm } from 'components/forms/profile/BioForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Bio',
  leftButton: <BackButton />,
};

export default function BioPage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO title="Bio | SoundChain" canonicalUrl="/settings/bio" description="SoundChain Bio" />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <BioForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
