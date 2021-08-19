import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import Head from 'next/head';

export default function UserNotifications() {
  return (
    <Layout>
      <Head>
        <title>Soundchain / Notifications</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="pt-3">
        <Notifications />
      </div>
    </Layout>
  );
}
