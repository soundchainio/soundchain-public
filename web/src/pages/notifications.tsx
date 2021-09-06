import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Layout } from 'components/Layout';
import { Notifications } from 'components/Notifications';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';

export default function UserNotifications() {
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
