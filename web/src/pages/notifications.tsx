import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import Head from 'next/head';

export default function UserNotifications() {
  return (
    <Layout title="Notifications">
      <Head>
        <title>Soundchain / Notifications</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Notifications />
    </Layout>
  );
}
