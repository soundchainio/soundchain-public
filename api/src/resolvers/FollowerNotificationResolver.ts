import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { FollowerNotification } from '../types/FollowerNotification';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';
import { Context } from '../types/Context';

@Resolver(FollowerNotification)
export class FollowerNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
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
  body(): string {
    return 'followed you';
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { followerHandle } = metadata as FollowerNotificationMetadata;
    return `/profiles/${followerHandle}`;
  }
}
