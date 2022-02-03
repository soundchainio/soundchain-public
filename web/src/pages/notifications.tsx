import { ClearAllNotificationsButton } from 'components/ClearAllNotificationsButton';
import { Notifications } from 'components/Notifications';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { cacheFor } from 'lib/apollo';
import { useResetNotificationCountMutation } from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import { useEffect } from 'react';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(UserNotifications, {}, context, apolloClient);
});

export default function UserNotifications() {
  const [resetNotificationCount] = useResetNotificationCountMutation();
  const { setTopNavBarProps } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
  }, [setTopNavBarProps]);

  useEffect(() => {
    resetNotificationCount();
  }, [resetNotificationCount]);

  const topNavBarProps: TopNavBarProps = {
    rightButton: <ClearAllNotificationsButton />,
  };

  return (
    <>
      <SEO title="Alerts | SoundChain" description="Check your alerts on SoundChain" canonicalUrl="/notifications/" />
      <Notifications />
    </>
  );
}
