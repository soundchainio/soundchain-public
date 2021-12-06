import {
  CommentNotification,
  FollowerNotification,
  NewPostNotification,
  NewVerificationRequestNotification,
  NftSoldNotification,
  NotificationType,
  ReactionNotification,
  useNotificationQuery,
  VerificationRequestNotification,
  DeletedPostNotification,
  DeletedCommentNotification,
} from 'lib/graphql';
import React from 'react';
import { CommentNotificationItem } from './CommentNotificationItem';
import { FollowerNotificationItem } from './FollowerNotificationItem';
import { NewPostNotificationItem } from './NewPostNotificationItem';
import { NewVerificationRequestNotificationItem } from './NewVerificationRequestNotificationItem';
import { NFTSoldNotificationItem } from './NFTSoldNotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';
import { ReactionNotificationItem } from './ReactionNotificationItem';
import { VerificationRequestNotificationItem } from './VerificationRequestNotificationItem';
import { DeletedPostNotificationItem } from './DeletedPostNotificationItem';
import { DeletedCommentNotificationItem } from './DeletedCommentNotificationItem'

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

  if (notification.type === NotificationType.VerificationRequestUpdate) {
    return (
      <VerificationRequestNotificationItem
        notification={notification as VerificationRequestNotification}
        index={index}
      />
    );
  }

  if (notification.type === NotificationType.NewVerificationRequest) {
    return (
      <NewVerificationRequestNotificationItem
        notification={notification as NewVerificationRequestNotification}
        index={index}
      />
    );
  }

  if (notification.type === NotificationType.DeletedPost) {
    return (
      <DeletedPostNotificationItem
        notification={notification as DeletedPostNotification}
        index={index}
      />
    );
  }

  if (notification.type === NotificationType.DeletedComment) {
    return (
      <DeletedCommentNotificationItem
        notification={notification as DeletedCommentNotification}
        index={index}
      />
    );
  }

  return null;
};
