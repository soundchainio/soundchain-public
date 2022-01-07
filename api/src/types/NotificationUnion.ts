import { createUnionType } from 'type-graphql';
import { AuctionEndedNotification } from './AuctionEndedNotification';
import { AuctionIsEndingNotification } from './AuctionIsEndingNotification';
import { CommentNotification } from './CommentNotification';
import { DeletedCommentNotification } from './DeletedCommentNotification';
import { DeletedPostNotification } from './DeletedPostNotification';
import { FollowerNotification } from './FollowerNotification';
import { NewBidNotification } from './NewBidNotification';
import { NewPostNotification } from './NewPostNotification';
import { NewVerificationRequestNotification } from './NewVerificationRequestNotification';
import { NFTSoldNotification } from './NFTSoldNotification';
import { NotificationType } from './NotificationType';
import { OutbidNotification } from './OutbidAuctionNotification';
import { ReactionNotification } from './ReactionNotification';
import { VerificationRequestNotification } from './VerificationRequestNotification';
import { WonAuctionNotification } from './WonAuctionNotification';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () =>
    [
      AuctionIsEndingNotification,
      AuctionEndedNotification,
      CommentNotification,
      DeletedCommentNotification,
      DeletedPostNotification,
      FollowerNotification,
      NewBidNotification,
      NewPostNotification,
      NewVerificationRequestNotification,
      NFTSoldNotification,
      OutbidNotification,
      ReactionNotification,
      VerificationRequestNotification,
      WonAuctionNotification,
    ] as const,
  resolveType: value => {
    if (value.type === NotificationType.Comment) {
      return CommentNotification;
    }
    if (value.type === NotificationType.Reaction) {
      return ReactionNotification;
    }
    if (value.type === NotificationType.Follower) {
      return FollowerNotification;
    }
    if (value.type === NotificationType.NewPost) {
      return NewPostNotification;
    }
    if (value.type === NotificationType.NFTSold) {
      return NFTSoldNotification;
    }
    if (value.type === NotificationType.VerificationRequestUpdate) {
      return VerificationRequestNotification;
    }
    if (value.type === NotificationType.NewVerificationRequest) {
      return NewVerificationRequestNotification;
    }
    if (value.type === NotificationType.DeletedPost) {
      return DeletedPostNotification;
    }
    if (value.type === NotificationType.DeletedComment) {
      return DeletedCommentNotification;
    }
    if (value.type === NotificationType.WonAuction) {
      return WonAuctionNotification;
    }
    if (value.type === NotificationType.AuctionIsEnding) {
      return AuctionIsEndingNotification;
    }
    if (value.type === NotificationType.Outbid) {
      return OutbidNotification;
    }
    if (value.type === NotificationType.NewBid) {
      return NewBidNotification;
    }
    if (value.type === NotificationType.AuctionEnded) {
      return AuctionEndedNotification;
    }
    return undefined;
  },
});
