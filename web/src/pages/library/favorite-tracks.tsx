import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteTracks } from 'components/FavoriteTracks';
import { Layout } from 'components/Layout';
import { SearchLibrary } from 'components/SearchLibrary';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import React, { useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
  leftButton: <BackButton />,
};

export default function FavoriteTracksPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <>
      <SEO
        title="Soundchain - Favorite Tracks"
        canonicalUrl="/library/favorite-tracks/"
        description="Soundchain Favorite Tracks"
      />
      <Layout topNavBarProps={topNavBarProps}>
        <SearchLibrary placeholder="Search tracks..." setSearchTerm={setSearchTerm} />
        <FavoriteTracks searchTerm={searchTerm} />
      </Layout>
    </>
  );
}
