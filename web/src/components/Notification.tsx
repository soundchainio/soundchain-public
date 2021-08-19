import { CommentNotification, useNotificationQuery } from 'lib/graphql';
import React from 'react';
import { CommentNotificationItem } from './CommentNotificationItem';
import { Label } from './Label';

interface NotificationProps {
  notificationId: string;
}

export const Notification = ({ notificationId }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } });
  const notification = data?.notification;

  if (!notification) return <Label>Loading</Label>;

  if (notification.__typename === 'CommentNotification') {
    return <CommentNotificationItem notification={notification as CommentNotification} />;
  }

  return null;
};
