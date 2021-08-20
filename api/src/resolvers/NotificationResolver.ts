import { CurrentUser } from 'decorators/current-user';
import { NotificationType } from 'enums/NotificationType';
import { CommentNotification } from 'models/CommentNotification';
import { Notification } from 'models/Notification';
import { Profile } from 'models/Profile';
import { User } from 'models/User';
import { NotificationService } from 'services/NotificationService';
import { ProfileService } from 'services/ProfileService';
import { Arg, Authorized, createUnionType, Mutation, Query, Resolver } from 'type-graphql';

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
    return ProfileService.resetNotificationCount(profileId);
  }
}
