import { createUnionType } from 'type-graphql';
import { CommentNotification } from './CommentNotification';
import { NotificationType } from './NotificationType';

export const NotificationUnion = createUnionType({
  name: 'Notification',
  types: () => [CommentNotification] as const,
  resolveType: value => {
    if (value.type === NotificationType.Comment) {
      return CommentNotification;
    }
    return undefined;
  },
});
