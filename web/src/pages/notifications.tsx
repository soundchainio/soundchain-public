import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { apolloClient } from 'lib/apollo';
import { ResetNotificationCountDocument, ResetNotificationCountMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';

export const getServerSideProps = protectPage(async context => {
  await apolloClient.mutate<ResetNotificationCountMutation>({ mutation: ResetNotificationCountDocument, context });
  return {
    props: {},
  };
});

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
