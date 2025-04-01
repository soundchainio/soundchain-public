import { FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { ReactionNotification } from '../types/ReactionNotification';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';
import { ReactionType } from '../types/ReactionType';

@Resolver(ReactionNotification)
export class ReactionNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  authorName(@Root() { metadata }: Notification): string {
    const { authorName } = metadata as ReactionNotificationMetadata;
    return authorName;
  }

  @FieldResolver(() => String, { nullable: true })
  authorPicture(@Root() { metadata }: Notification): string {
    const { authorPicture } = metadata as ReactionNotificationMetadata;
    return authorPicture || '';
  }

  @FieldResolver(() => String)
  postId(@Root() { metadata }: Notification): string {
    const { postId } = metadata as ReactionNotificationMetadata;
    return postId.toString(); // Convert to string in case it's an ObjectId
  }

  @FieldResolver(() => ReactionType)
  reactionType(@Root() { metadata }: Notification): ReactionType {
    const { reactionType } = metadata as ReactionNotificationMetadata;
    return reactionType;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId } = metadata as ReactionNotificationMetadata;
    return `/posts/${postId.toString()}`; // Convert to string in case it's an ObjectId
  }
}
