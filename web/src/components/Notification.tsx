import {
  AuctionIsEndingNotification,
  CommentNotification,
  DeletedCommentNotification,
  DeletedPostNotification,
  FollowerNotification,
  NewPostNotification,
  NewVerificationRequestNotification,
  NftSoldNotification,
  NotificationType,
  ReactionNotification,
  useNotificationQuery,
  VerificationRequestNotification,
  WonAuctionNotification,
} from 'lib/graphql';
import React from 'react';
import { AuctionIsEndingNotificationItem } from './AuctionIsEndingNotificationItem';
import { CommentNotificationItem } from './CommentNotificationItem';
import { DeletedCommentNotificationItem } from './DeletedCommentNotificationItem';
import { DeletedPostNotificationItem } from './DeletedPostNotificationItem';
import { FollowerNotificationItem } from './FollowerNotificationItem';
import { NewPostNotificationItem } from './NewPostNotificationItem';
import { NewVerificationRequestNotificationItem } from './NewVerificationRequestNotificationItem';
import { NFTSoldNotificationItem } from './NFTSoldNotificationItem';
import { NotificationSkeleton } from './NotificationSkeleton';
import { ReactionNotificationItem } from './ReactionNotificationItem';
import { VerificationRequestNotificationItem } from './VerificationRequestNotificationItem';
import { WonAuctionNotificationItem } from './WonAuctionNotificationItem';

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
    case NotificationType.WonAuction: {
      return <WonAuctionNotificationItem notification={notification as WonAuctionNotification} index={index} />;
    }
    case NotificationType.AuctionIsEnding: {
      return (
        <AuctionIsEndingNotificationItem notification={notification as AuctionIsEndingNotification} index={index} />
      );
    }
    default: {
      return null;
    }
  }
};
