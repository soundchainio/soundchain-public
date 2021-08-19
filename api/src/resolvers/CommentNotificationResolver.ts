import { CommentNotification, CommentNotificationMetadata } from 'models/CommentNotification';
import { Notification } from 'models/Notification';
import { FieldResolver, Resolver, Root } from 'type-graphql';

@Resolver(CommentNotification)
export class CommentNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id;
  }

  @FieldResolver(() => String)
  body(@Root() { metadata }: Notification): string {
    return `${(metadata as CommentNotificationMetadata).commentatorDisplayName} commented your post.`;
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    return (metadata as CommentNotificationMetadata).commentBody;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata }: Notification): string {
    const { postId, commentId } = metadata as CommentNotificationMetadata;
    return `/posts/${postId}?commentId=${commentId}`;
  }
}
