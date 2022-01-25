import { InboxButton } from 'components/Buttons/InboxButton';
import { Layout } from 'components/Layout';
import { Marketplace } from 'components/Marketplace';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { MeDocument, MeQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';

interface HomePageProps {
  me?: MeQuery['me'];
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async context => {
  const apolloClient = createApolloClient(context);

  const { data } = await apolloClient.query({
    query: MeDocument,
    context,
  });

  return cacheFor(HomePage, { me: data.me }, context, apolloClient);
};

export default function HomePage({ me }: HomePageProps) {
  const topNavBarProps: TopNavBarProps = {
    title: 'Marketplace',
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <>
      <SEO title="Soundchain - Marketplace" canonicalUrl="/marketplace" description="Soundchain NFT Marketplace" />
      <Layout topNavBarProps={topNavBarProps}>
        <Marketplace />
      </Layout>
    </>
  );
}
