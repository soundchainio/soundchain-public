import { CommentNotification, NotificationType, useNotificationQuery } from 'lib/graphql';
import React from 'react';
import { CommentNotificationItem } from './CommentNotificationItem';
import { Label } from './Label';

interface NotificationProps {
  notificationId: string;
  index: number;
}

export const Notification = ({ notificationId, index }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } });
  const notification = data?.notification;

  if (!notification) return <Label>Loading</Label>;

  if (notification.type === NotificationType.Comment) {
    return <CommentNotificationItem notification={notification as CommentNotification} index={index} />;
  }

  return null;
};
