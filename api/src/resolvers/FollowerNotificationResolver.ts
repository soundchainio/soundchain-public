import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { FollowerNotification } from '../types/FollowerNotification';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';

@Resolver(FollowerNotification)
export class FollowerNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  followerName(@Root() { metadata }: Notification): string {
    const { followerName } = metadata as FollowerNotificationMetadata;
    return followerName;
  }

  @FieldResolver(() => String, { nullable: true })
  followerPicture(@Root() { metadata }: Notification): string | undefined {
    const { followerPicture } = metadata as FollowerNotificationMetadata;
    return followerPicture;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { followerId } = metadata as FollowerNotificationMetadata;
    return `/profiles/${followerId}`;
  }
}
