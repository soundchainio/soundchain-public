import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Social Links',
  leftButton: <BackButton />,
};

export default function SocialLinksPage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO
        title="Soundchain - Social Links"
        canonicalUrl="/settings/social-links/"
        description="Soundchain Social Links"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <SocialLinksForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
