import { createUnionType } from 'type-graphql';
import { CommentNotification } from './CommentNotification';
import { FollowerNotification } from './FollowerNotification';
import { NotificationType } from './NotificationType';
import { ReactionNotification } from './ReactionNotification';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () => [CommentNotification, ReactionNotification, FollowerNotification] as const,
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
    return undefined;
  },
});
