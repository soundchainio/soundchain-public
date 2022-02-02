import { BackButton } from 'components/Buttons/BackButton';
import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useRouter } from 'next/router';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function ProfilePicturePage() {
  const router = useRouter();

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO
        title="Profile Picture | SoundChain"
        canonicalUrl="/settings/profile-picture/"
        description="SoundChain Profile Picture"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <ProfilePictureForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </Layout>
  );
}
