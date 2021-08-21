import { CurrentUser } from 'decorators/current-user';
import { NotificationType } from 'enums/NotificationType';
import { CommentNotification } from 'models/CommentNotification';
import { Profile } from 'models/Profile';
import { User } from 'models/User';
import { NotificationService } from 'services/NotificationService';
import { Arg, Authorized, createUnionType, Mutation, Query, Resolver } from 'type-graphql';
import { ClearNotificationsPayload } from './types/ClearNotificationsPayload';

export const NotificationUnion = createUnionType({
  name: 'NotificationUnion',
  types: () => [CommentNotification] as const,
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
  @Authorized()
  notifications(@CurrentUser() { profileId }: User): Promise<Array<typeof NotificationUnion>> {
    return NotificationService.getNotifications(profileId);
  }

  @Query(() => NotificationUnion)
  @Authorized()
  notification(@Arg('id') id: string, @CurrentUser() { profileId }: User): Promise<typeof NotificationUnion> {
    return NotificationService.getNotification(id, profileId);
  }

  @Mutation(() => Profile)
  @Authorized()
  resetNotificationCount(@CurrentUser() { profileId }: User): Promise<Profile> {
    return NotificationService.resetNotificationCount(profileId);
  }

  @Mutation(() => ClearNotificationsPayload)
  @Authorized()
  async clearNotifications(@CurrentUser() { profileId }: User): Promise<ClearNotificationsPayload> {
    const success = await NotificationService.clearNotifications(profileId);
    return { success };
  }
}
