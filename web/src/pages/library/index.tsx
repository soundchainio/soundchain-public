import { InboxButton } from 'components/Buttons/InboxButton';
import { Layout } from 'components/Layout';
import { MenuLink } from 'components/MenuLink';
import { TopNavBarProps } from 'components/TopNavBar';
import { Artist } from 'icons/Artist';
import { Heart } from 'icons/Heart';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import { MeDocument, MeQuery } from 'lib/graphql';
import Head from 'next/head';
import React from 'react';

interface HomePageProps {
  me?: MeQuery['me'];
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  });

  return cacheFor(LibraryPage, { me: data.me }, context, apolloClient);
});

export default function LibraryPage({ me }: HomePageProps) {
  const topNavBarProps: TopNavBarProps = {
    title: 'Library',
    rightButton: me ? <InboxButton /> : undefined,
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
