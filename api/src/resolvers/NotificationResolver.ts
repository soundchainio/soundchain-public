import { Arg, Authorized, createUnionType, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { CommentNotification } from '../models/CommentNotification';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { NotificationService } from '../services/NotificationService';
import { ClearNotificationsPayload } from '../types/ClearNotificationsPayload';
import { NotificationConnection } from '../types/NotificationConnection';
import { NotificationType } from '../types/NotificationType';
import { PageInput } from '../types/PageInput';
import { SortNotificationInput } from '../types/SortNotificationInput';

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
  @Query(() => NotificationConnection)
  @Authorized()
  notifications(
    @CurrentUser() { profileId }: User,
    @Arg('sort', { nullable: true }) sort?: SortNotificationInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<NotificationConnection> {
    return NotificationService.getNotifications(profileId, sort, page);
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
