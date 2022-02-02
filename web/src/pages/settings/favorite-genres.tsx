import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { useRouter } from 'next/router';
import React from 'react';

export default function EditFavoriteGenresPage() {
  const me = useMe();
  const router = useRouter();

  const topNavBarProps: TopNavBarProps = {
    title: 'Favorite Genres',
    leftButton: <BackButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO
        title="Favorite Genres | SoundChain"
        canonicalUrl="/settings/cover-picture"
        description="SoundChain Favorite Genres"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <FavoriteGenresForm
            afterSubmit={() => router.push('/settings')}
            initialGenres={me?.profile?.favoriteGenres || []}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </div>
    </Layout>
  );
}
