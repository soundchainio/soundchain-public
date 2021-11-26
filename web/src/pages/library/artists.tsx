import { Artists } from 'components/Artists';
import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { SearchLibrary } from 'components/SearchLibrary';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';
import React, { useState } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Artists',
  leftButton: <BackButton />,
};

export default function ArtistsPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Artists</title>
        <meta name="description" content="Artists" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SearchLibrary placeholder="Search artists..." setSearchTerm={setSearchTerm} />
      <Artists searchTerm={searchTerm} />
    </Layout>
  );
}
