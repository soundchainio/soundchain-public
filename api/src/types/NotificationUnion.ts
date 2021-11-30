import { createUnionType } from 'type-graphql';
import { CommentNotification } from './CommentNotification';
import { FollowerNotification } from './FollowerNotification';
import { NewPostNotification } from './NewPostNotification';
import { NewVerificationRequestNotification } from './NewVerificationRequestNotification';
import { NFTSoldNotification } from './NFTSoldNotification';
import { NotificationType } from './NotificationType';
import { ReactionNotification } from './ReactionNotification';
import { VerificationRequestNotification } from './VerificationRequestNotification';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () =>
    [
      CommentNotification,
      ReactionNotification,
      FollowerNotification,
      NewPostNotification,
      NFTSoldNotification,
      VerificationRequestNotification,
      NewVerificationRequestNotification,
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
    return undefined;
  },
});
