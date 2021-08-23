import { SortNotificationField, SortOrder, useNotificationsQuery } from 'lib/graphql';
import React from 'react';
import { Notification as NotificationItem } from './Notification';
import { NotificationSkeleton } from './NotificationSkeleton';

export const Notifications = () => {
  const { data } = useNotificationsQuery({
    variables: { sort: { field: SortNotificationField.CreatedAt, order: SortOrder.Desc } },
  });

  if (!data) {
    return <NotificationSkeleton />;
  }

  return (
    <div>
      {data.notifications.nodes.map((notification, index) => (
        <NotificationItem key={index} index={index} notificationId={notification.id} />
      ))}
    </div>
  );
};
