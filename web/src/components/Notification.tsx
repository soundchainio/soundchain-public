import React from 'react'

import { CommentNotificationItem } from 'components/Comment/CommentNotificationItem'
import {
  AuctionEndedNotification,
  AuctionIsEndingNotification,
  CommentNotification,
  DeletedCommentNotification,
  DeletedPostNotification,
  FollowerNotification,
  NewBidNotification,
  NewPostNotification,
  NewVerificationRequestNotification,
  NftSoldNotification,
  NotificationType,
  OutbidNotification,
  ReactionNotification,
  useNotificationQuery,
  VerificationRequestNotification,
  WonAuctionNotification,
} from 'lib/graphql'

import { AuctionEndedNotificationItem } from './AuctionEndedNotificationItem'
import { AuctionIsEndingNotificationItem } from './AuctionIsEndingNotificationItem'
import { CloseFunction } from './common/PopOverButton/PopOverButton'
import { DeletedCommentNotificationItem } from './DeletedCommentNotificationItem'
import { DeletedPostNotificationItem } from './DeletedPostNotificationItem'
import { FollowerNotificationItem } from './FollowerNotificationItem'
import { NewBidNotificationItem } from './NewBidNotificationItem'
import { NewPostNotificationItem } from './NewPostNotificationItem'
import { NewVerificationRequestNotificationItem } from './NewVerificationRequestNotificationItem'
import { NFTSoldNotificationItem } from './NFTSoldNotificationItem'
import { NotificationSkeleton } from './NotificationSkeleton'
import { OutbidNotificationItem } from './OutbidNotificationItem'
import { ReactionNotificationItem } from './ReactionNotificationItem'
import { VerificationRequestNotificationItem } from './VerificationRequestNotificationItem'
import { WonAuctionNotificationItem } from './WonAuctionNotificationItem'

interface NotificationProps {
  notificationId: string
  index: number
  closePopOver?: CloseFunction
}

export const Notification = ({ notificationId, index, closePopOver }: NotificationProps) => {
  const { data } = useNotificationQuery({ variables: { id: notificationId } })
  const notification = data?.notification

  if (!notification) return <NotificationSkeleton />

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = () => {
    if (closePopOver) {
      closePopOver()
    }
  }

  switch (notification.type) {
    case NotificationType.Comment: {
      return (
        <span onClick={handleClick}>
          <CommentNotificationItem notification={notification as CommentNotification} index={index} />
        </span>
      )
    }

    case NotificationType.Follower: {
      return (
        <span onClick={handleClick}>
          <FollowerNotificationItem notification={notification as FollowerNotification} index={index} />
        </span>
      )
    }

    case NotificationType.Reaction: {
      return (
        <span onClick={handleClick}>
          <ReactionNotificationItem notification={notification as ReactionNotification} index={index} />
        </span>
      )
    }
    case NotificationType.NewPost: {
      return (
        <span onClick={handleClick}>
          <NewPostNotificationItem notification={notification as NewPostNotification} index={index} />
        </span>
      )
    }
    case NotificationType.NftSold: {
      return (
        <span onClick={handleClick}>
          <NFTSoldNotificationItem notification={notification as NftSoldNotification} index={index} />
        </span>
      )
    }
    case NotificationType.VerificationRequestUpdate: {
      return (
        <span onClick={handleClick}>
          <VerificationRequestNotificationItem
            notification={notification as VerificationRequestNotification}
            index={index}
          />
        </span>
      )
    }
    case NotificationType.NewVerificationRequest: {
      return (
        <span onClick={handleClick}>
          <NewVerificationRequestNotificationItem
            notification={notification as NewVerificationRequestNotification}
            index={index}
          />
        </span>
      )
    }
    case NotificationType.DeletedPost: {
      return (
        <span onClick={handleClick}>
          <DeletedPostNotificationItem notification={notification as DeletedPostNotification} index={index} />
        </span>
      )
    }
    case NotificationType.DeletedComment: {
      return (
        <span onClick={handleClick}>
          <DeletedCommentNotificationItem notification={notification as DeletedCommentNotification} index={index} />
        </span>
      )
    }
    case NotificationType.WonAuction: {
      return (
        <span onClick={handleClick}>
          <WonAuctionNotificationItem notification={notification as WonAuctionNotification} index={index} />
        </span>
      )
    }
    case NotificationType.AuctionIsEnding: {
      return (
        <span onClick={handleClick}>
          <AuctionIsEndingNotificationItem notification={notification as AuctionIsEndingNotification} index={index} />
        </span>
      )
    }
    case NotificationType.Outbid: {
      return (
        <span onClick={handleClick}>
          <OutbidNotificationItem notification={notification as OutbidNotification} index={index} />
        </span>
      )
    }
    case NotificationType.NewBid: {
      return (
        <span onClick={handleClick}>
          <NewBidNotificationItem notification={notification as NewBidNotification} index={index} />
        </span>
      )
    }
    case NotificationType.AuctionEnded: {
      return (
        <span onClick={handleClick}>
          <AuctionEndedNotificationItem notification={notification as AuctionEndedNotification} index={index} />
        </span>
      )
    }
    default: {
      return <></>
    }
  }
}
