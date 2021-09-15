import { createUnionType } from 'type-graphql';
import { CommentNotification } from './CommentNotification';
import { FollowerNotification } from './FollowerNotification';
import { NewPostNotification } from './NewPostNotification';
import { NotificationType } from './NotificationType';
import { ReactionNotification } from './ReactionNotification';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () => [CommentNotification, ReactionNotification, FollowerNotification, NewPostNotification] as const,
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
    return undefined;
  },
});
