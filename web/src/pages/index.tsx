import { Layout } from 'components/Layout';
import { Posts } from 'components/Posts';
import Head from 'next/head';

export default function Feed() {
  return (
    <Layout>
      <Head>
        <title>Soundchain</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="pt-3">
        <Posts />
      </div>
    </Layout>
  );
}
