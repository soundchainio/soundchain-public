import { createUnionType } from 'type-graphql';
import { AuctionIsEndingNotification } from './AuctionIsEndingNotification';
import { CommentNotification } from './CommentNotification';
import { DeletedCommentNotification } from './DeletedCommentNotification';
import { DeletedPostNotification } from './DeletedPostNotification';
import { FollowerNotification } from './FollowerNotification';
import { NewPostNotification } from './NewPostNotification';
import { NewVerificationRequestNotification } from './NewVerificationRequestNotification';
import { NFTSoldNotification } from './NFTSoldNotification';
import { NotificationType } from './NotificationType';
import { ReactionNotification } from './ReactionNotification';
import { VerificationRequestNotification } from './VerificationRequestNotification';
import { WonAuctionNotification } from './WonAuctionNotification';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () =>
    [
      AuctionIsEndingNotification,
      CommentNotification,
      DeletedCommentNotification,
      DeletedPostNotification,
      FollowerNotification,
      NewPostNotification,
      NewVerificationRequestNotification,
      NFTSoldNotification,
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
    return undefined;
  },
});
