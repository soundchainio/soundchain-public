import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { ClearNotificationsPayload } from '../types/ClearNotificationsPayload';
import { Context } from '../types/Context';
import { NotificationConnection } from '../types/NotificationConnection';
import { NotificationUnion } from '../types/NotificationUnion';
import { PageInput } from '../types/PageInput';
import { SortNotificationInput } from '../types/SortNotificationInput';

@Resolver()
export class NotificationResolver {
  @Query(() => NotificationConnection)
  @Authorized()
  notifications(
    @CurrentUser() { profileId }: User,
    @Ctx() { notificationService }: Context,
    @Arg('sort', { nullable: true }) sort?: SortNotificationInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<NotificationConnection> {
    return notificationService.getNotifications(profileId, sort, page);
  }

  @Query(() => NotificationUnion)
  @Authorized()
  notification(
    @CurrentUser() { profileId }: User,
    @Ctx() { notificationService }: Context,
    @Arg('id') id: string,
  ): Promise<typeof NotificationUnion> {
    return notificationService.getNotification(id, profileId);
  }

  @Mutation(() => Profile)
  @Authorized()
  resetNotificationCount(
    @CurrentUser() { profileId }: User,
    @Ctx() { notificationService }: Context,
  ): Promise<Profile> {
    return notificationService.resetNotificationCount(profileId);
  }

  @Mutation(() => ClearNotificationsPayload)
  @Authorized()
  async clearNotifications(
    @CurrentUser() { profileId }: User,
    @Ctx() { notificationService }: Context,
  ): Promise<ClearNotificationsPayload> {
    const success = await notificationService.clearNotifications(profileId);
    return { success };
  }
}
