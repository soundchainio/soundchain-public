import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { LayoutMenu } from 'components/LayoutMenu';
import { Notifications } from 'components/Notifications';
import { TopNavBarProps } from 'components/TopNavBar';
import { cacheFor } from 'lib/apollo';
import { ResetNotificationCountDocument, ResetNotificationCountMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Head from 'next/head';

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  await apolloClient.mutate<ResetNotificationCountMutation>({ mutation: ResetNotificationCountDocument, context });
  return cacheFor(UserNotifications, {}, context, apolloClient);
});

export default function UserNotifications() {
  const topNavBarProps: TopNavBarProps = {
    title: 'Notifications',
    rightButton: ClearAllNotificationsButton,
  };

  return (
    <LayoutMenu topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain / Notifications</title>
        <meta name="description" content="Notifications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Notifications />
    </LayoutMenu>
  );
}
