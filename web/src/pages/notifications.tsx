import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { useResetNotificationCountMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';
import { useEffect } from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(UserNotifications, {}, context, apolloClient);
});

export default function UserNotifications() {
  const [resetNotificationCount] = useResetNotificationCountMutation();

  useEffect(() => {
    resetNotificationCount();
  }, []);

  const topNavBarProps: TopNavBarProps = {
    rightButton: <ClearAllNotificationsButton />,
  };

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Notifications</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Notifications />
    </Layout>
  );
}
