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
import { DeletedCommentNotificationItem } from './DeletedCommentNotificationItem';

interface NotificationProps {
  notificationId: string;
  index: number;
}

export const Notification = ({ notificationId, index }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } });
  const notification = data?.notification;

  if (!notification) return <NotificationSkeleton />;

  switch (notification.type) {
    case NotificationType.Comment: {
      return <CommentNotificationItem notification={notification as CommentNotification} index={index} />;
    }
    case NotificationType.Follower: {
      return <FollowerNotificationItem notification={notification as FollowerNotification} index={index} />;
    }
    case NotificationType.Reaction: {
      return <ReactionNotificationItem notification={notification as ReactionNotification} index={index} />;
    }
    case NotificationType.NewPost: {
      return <NewPostNotificationItem notification={notification as NewPostNotification} index={index} />;
    }
    case NotificationType.NftSold: {
      return <NFTSoldNotificationItem notification={notification as NftSoldNotification} index={index} />;
    }
    case NotificationType.VerificationRequestUpdate: {
      return (
        <VerificationRequestNotificationItem
          notification={notification as VerificationRequestNotification}
          index={index}
        />
      );
    }
    case NotificationType.NewVerificationRequest: {
      return (
        <NewVerificationRequestNotificationItem
          notification={notification as NewVerificationRequestNotification}
          index={index}
        />
      );
    }
    case NotificationType.DeletedPost: {
      return <DeletedPostNotificationItem notification={notification as DeletedPostNotification} index={index} />;
    }
    case NotificationType.DeletedComment: {
      return <DeletedCommentNotificationItem notification={notification as DeletedCommentNotification} index={index} />;
    }
    default: {
      return null;
    }
  }
};
