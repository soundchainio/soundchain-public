import { InboxButton } from 'components/Buttons/InboxButton';
import { Feed } from 'components/Feed';
import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { MeDocument, MeQuery } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

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
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <SEO title="Soundchain" description="Connecting people to music" canonicalUrl="/" />
      <Layout topNavBarProps={topNavBarProps}>
        <div className="pt-3">{me ? <Feed /> : <Posts />}</div>
      </Layout>
    </>
  );
}
