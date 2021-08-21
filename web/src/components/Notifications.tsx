import { useNotificationsQuery } from 'lib/graphql';
import React from 'react';
import { Notification as NotificationItem } from './Notification';
import { PostSkeleton } from './PostSkeleton';

export const Notifications = () => {
  const { data } = useNotificationsQuery();

  if (!data) {
    return <PostSkeleton />;
  }

  return (
    <div>
      {data.notifications.map((notification, index) => (
        <NotificationItem key={index} index={index} notificationId={notification.id} />
      ))}
    </div>
  );
};
