import { BackButton } from 'components/Buttons/BackButton';
import { FavoriteTracks } from 'components/FavoriteTracks';
import { Layout } from 'components/Layout';
import { SearchLibrary } from 'components/SearchLibrary';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import React, { useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Tracks',
  leftButton: <BackButton />,
};

export default function FavoriteTracksPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Favorite Tracks</title>
        <meta name="description" content="Favorite Tracks" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SearchLibrary placeholder="Search tracks..." setSearchTerm={setSearchTerm} />
      <FavoriteTracks searchTerm={searchTerm} />
    </Layout>
  );
}
