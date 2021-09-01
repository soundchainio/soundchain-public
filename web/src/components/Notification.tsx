import { CommentNotification, FollowerNotification, NotificationType, useNotificationQuery } from 'lib/graphql';
import React from 'react';
import { CommentNotificationItem } from './CommentNotificationItem';
import { FollowerNotificationItem } from './FollowerNotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';

interface NotificationProps {
  notificationId: string;
  index: number;
}

export const Notification = ({ notificationId, index }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } });
  const notification = data?.notification;

  if (!notification) return <NotificationSkeleton />;

  if (notification.type === NotificationType.Comment) {
    return <CommentNotificationItem notification={notification as CommentNotification} index={index} />;
  }
  if (notification.type === NotificationType.Follower) {
    return <FollowerNotificationItem notification={notification as FollowerNotification} index={index} />;
  }

  return null;
};
