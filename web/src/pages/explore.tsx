import { Explore } from 'components/Explore';
import { ExploreSearchBar } from 'components/ExploreSearchBar';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
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
      <SEO title="Soundchain - Explore" description="Explore Soundchain" canonicalUrl="/explore/" />
      <Explore searchTerm={searchTerm} />
    </Layout>
  );
}
