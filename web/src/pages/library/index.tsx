import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { MenuLink } from 'components/MenuLink';
import { TopNavBarProps } from 'components/TopNavBar';
import { Heart } from 'icons/Heart';
import Head from 'next/head';
import React from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Library',
  leftButton: <BackButton />,
};

export default function LibraryPage() {
  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <Head>
        <title>Soundchain - Library</title>
        <meta name="description" content="Library" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MenuLink icon={Heart} label="Favorite Tracks" href="/library/favorite-tracks" />
    </Layout>
  );
}
