import { NotificationType } from 'enums/NotificationType';
import { CommentNotification } from 'models/CommentNotification';
import { Notification } from 'models/Notification';
import { NotificationService } from 'services/NotificationService';
import { createUnionType, Query, Resolver } from 'type-graphql';

const NotificationUnion = createUnionType({
  name: 'NotificationUnion',
  types: () => [Notification, CommentNotification] as const,
  resolveType: value => {
    if (value.type === NotificationType.Comment) {
      return CommentNotification;
    }
    return undefined;
  },
});

@Resolver()
export class NotificationResolver {
  @Query(() => [NotificationUnion])
  // TO-DO: Add authorization and use current user. FIXED ID FOR TESTING PURPOSES.
  notifications(): Promise<Array<typeof NotificationUnion>> {
    return NotificationService.getNotifications('6109580bcd5728ff7f115c55');
  }
}
