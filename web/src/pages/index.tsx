import { InboxButton } from 'components/Buttons/InboxButton';
import { Feed } from 'components/Feed';
import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { cacheFor } from 'lib/apollo';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = context => {
  return cacheFor(HomePage, {}, context);
};

export default function HomePage() {
  const me = useMe();

  const topNavBarProps: TopNavBarProps = {
    rightButton: me ? InboxButton : undefined,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="pt-3">{me ? <Feed /> : <Posts />}</div>
    </Layout>
  );
}
