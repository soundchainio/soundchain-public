import classNames from 'classnames';
import { Notification, PostsQueryVariables, useNotificationsQuery } from 'lib/graphql';
import React, { useEffect } from 'react';
import { PostSkeleton } from './PostSkeleton';
import { Notification as NotificationItem } from './Notification';

interface NotificationsProps extends React.ComponentPropsWithoutRef<'div'> {
  variables?: PostsQueryVariables;
}

export const Notifications = ({ className }: NotificationsProps) => {
  const { data } = useNotificationsQuery();

  useEffect(() => {
    console.log(data);
  }, [data]);

  if (!data) {
    return <PostSkeleton />;
  }

  return (
    <div className={classNames('space-y-3', className)}>
      {data.notifications.map((notification, index) => (
        <NotificationItem key={index} notificationId={(notification as Notification).id} />
      ))}
    </div>
  );
};
