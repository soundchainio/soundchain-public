import { InboxButton } from 'components/Buttons/InboxButton';
import { Explore } from 'components/Explore';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(ExplorePage, {}, context, apolloClient);
});

export default function ExplorePage() {
  const me = useMe();
  const topNavBarProps: TopNavBarProps = {
    title: 'Explore',
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <SEO title="Soundchain - Explore" description="Explore Soundchain" canonicalUrl="/explore/" />
      <Explore />
    </Layout>
  );
}
