import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { ReactionNotification } from '../types/ReactionNotification';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';

@Resolver(ReactionNotification)
export class ReactionNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String, { nullable: true })
  reactionType(@Root() { metadata }: Notification): string | undefined {
    const { reactionType } = metadata as ReactionNotificationMetadata;
    return reactionType;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId } = metadata as ReactionNotificationMetadata;
    return `/profiles/${postId}`;
  }
}
