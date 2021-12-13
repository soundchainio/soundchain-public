import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { MenuLink } from 'components/MenuLink';
import { TopNavBarProps } from 'components/TopNavBar';
import { Artist } from 'icons/Artist';
import { Heart } from 'icons/Heart';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import React from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(LibraryPage, {}, context, apolloClient);
});

export default function LibraryPage() {
  const topNavBarProps: TopNavBarProps = {
    title: 'Library',
    leftButton: <BackButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Library</title>
        <meta name="description" content="Library" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <MenuLink icon={Heart} label="Favorite Tracks" href="/library/favorite-tracks" />
      <MenuLink icon={Artist} label="Artists" href="/library/artists" />
    </Layout>
  );
}
