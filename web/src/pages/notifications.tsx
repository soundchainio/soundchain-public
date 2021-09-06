import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { useResetNotificationCountMutation } from 'lib/graphql';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function UserNotifications() {
  const [resetNotificationCount] = useResetNotificationCountMutation();
  const me = useMe()
  const router = useRouter()

  useEffect(() => {
    if(!me) return router.push('/login')
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
