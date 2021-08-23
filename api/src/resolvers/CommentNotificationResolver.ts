import { FieldResolver, Resolver, Root } from 'type-graphql';
import { CommentNotification, CommentNotificationMetadata } from '../models/CommentNotification';
import { Notification } from '../models/Notification';

@Resolver(CommentNotification)
export class CommentNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  author(@Root() { metadata }: Notification): string {
    const { authorName } = metadata as CommentNotificationMetadata;
    return authorName;
  }

  @FieldResolver(() => String, { nullable: true })
  authorPicture(@Root() { metadata }: Notification): string | undefined {
    const { authorPicture } = metadata as CommentNotificationMetadata;
    return authorPicture;
  }

  @FieldResolver(() => String)
  body(): string {
    return `commented your post:`;
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { commentBody } = metadata as CommentNotificationMetadata;
    return commentBody;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId, commentId } = metadata as CommentNotificationMetadata;
    return `/posts/${postId}?commentId=${commentId}`;
  }
}
