import { Feed } from 'components/Feed';
import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import { useMe } from 'hooks/useMe';
import Head from 'next/head';

export default function HomePage() {
  const me = useMe();

  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="pt-3">{me ? <Feed /> : <Posts />}</div>
    </Layout>
  );
}
