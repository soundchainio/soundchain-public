import { BackButton } from 'components/Buttons/BackButton';
import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Musician Type',
};

export default function MusicianTypePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO
        title="Soundchain - Musician Type"
        canonicalUrl="/settings/musician-type/"
        description="Soundchain Musician Type"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypesForm
            afterSubmit={() => router.push('/settings')}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </div>
    </Layout>
  );
}
