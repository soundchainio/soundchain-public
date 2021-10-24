import {
  CommentNotification,
  FollowerNotification,
  NewPostNotification,
  NftSoldNotification,
  NotificationType,
  ReactionNotification,
  useNotificationQuery,
} from 'lib/graphql';
import React from 'react';
import { CommentNotificationItem } from './CommentNotificationItem';
import { FollowerNotificationItem } from './FollowerNotificationItem';
import { NewPostNotificationItem } from './NewPostNotificationItem';
import { NFTSoldNotificationItem } from './NFTSoldNotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';
import { ReactionNotificationItem } from './ReactionNotificationItem';

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

  if (notification.type === NotificationType.Reaction) {
    return <ReactionNotificationItem notification={notification as ReactionNotification} index={index} />;
  }

  if (notification.type === NotificationType.NewPost) {
    return <NewPostNotificationItem notification={notification as NewPostNotification} index={index} />;
  }

  if (notification.type === NotificationType.NftSold) {
    return <NFTSoldNotificationItem notification={notification as NftSoldNotification} index={index} />;
  }

  return null;
};
