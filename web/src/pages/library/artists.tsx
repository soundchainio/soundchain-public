import { Artists } from 'components/Artists';
import { BackButton } from 'components/Buttons/BackButton';
import { Layout } from 'components/Layout';
import { SearchLibrary } from 'components/SearchLibrary';
import SEO from 'components/SEO';
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
    <>
      <SEO title="Soundchain - Artists" canonicalUrl="/library/artists" description="Soundchain Artists" />
      <Layout topNavBarProps={topNavBarProps}>
        <Head>
          <title>Soundchain - Artists</title>
          <meta name="description" content="Artists" />
          <link rel="icon" href="/favicons/favicon.ico" />
        </Head>
        <SearchLibrary placeholder="Search artists..." setSearchTerm={setSearchTerm} />
        <Artists searchTerm={searchTerm} />
      </Layout>
    </>
  );
}
