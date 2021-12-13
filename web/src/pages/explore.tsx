import { Explore } from 'components/Explore';
import { ExploreSearchBar } from 'components/ExploreSearchBar';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { useState } from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(ExplorePage, {}, context, apolloClient);
});

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const topNavBarProps: TopNavBarProps = {
    midRightButton: <ExploreSearchBar setSearchTerm={setSearchTerm} />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Explore</title>
        <meta name="description" content="Explore" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <Explore searchTerm={searchTerm} />
    </Layout>
  );
}
