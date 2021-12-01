import { InboxButton } from 'components/Buttons/InboxButton';
import { Feed } from 'components/Feed';
import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import Head from 'next/head';

export default function HomePage() {
  const me = useMe();

  const topNavBarProps: TopNavBarProps = {
    rightButton: me ? <InboxButton /> : undefined,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SEO title="Soundchain" description="Connecting people to music" canonicalUrl="/" />
      <div className="pt-3">{me ? <Feed /> : <Posts />}</div>
    </Layout>
  );
}
