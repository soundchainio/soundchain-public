import { BackButton } from 'components/Buttons/BackButton';
import { Inbox } from 'components/Inbox';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(MessagesPage, {}, context, apolloClient);
});

export default function MessagesPage() {
  const topNavBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Inbox</title>
        <meta name="description" content="Inbox" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Inbox />
    </Layout>
  );
}
