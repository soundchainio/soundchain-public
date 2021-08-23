import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { cacheFor } from 'lib/apollo';
import { ResetNotificationCountDocument, ResetNotificationCountMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';

export const getServerSideProps = protectPage((context, apolloClient) => {
  apolloClient.mutate<ResetNotificationCountMutation>({ mutation: ResetNotificationCountDocument, context });
  return cacheFor(UserNotifications, {}, context, apolloClient);
});

export default function UserNotifications() {
  return (
    <Layout title="Notifications" topRightButton={<ClearAllNotificationsButton />}>
      <Head>
        <title>Soundchain / Notifications</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Notifications />
    </Layout>
  );
}
