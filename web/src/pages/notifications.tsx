import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { TopNavBarProps } from 'components/TopNavBar';
import { useResetNotificationCountMutation } from 'lib/graphql';
import Head from 'next/head';
import { useEffect } from 'react';

export default function UserNotifications() {
  const [resetNotificationCount] = useResetNotificationCountMutation();

  useEffect(() => {
    resetNotificationCount();
  }, []) 

  const topNavBarProps: TopNavBarProps = {
    title: 'Notifications',
    rightButton: ClearAllNotificationsButton,
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
