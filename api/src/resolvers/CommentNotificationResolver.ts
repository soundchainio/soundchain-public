import { CommentNotification } from 'models/CommentNotification';
import { Notification } from 'models/Notification';
import { FieldResolver, Resolver, Root } from 'type-graphql';

@Resolver(CommentNotification)
export class CommentNotificationResolver {
  @FieldResolver(() => String)
  body(@Root() { metadata }: Notification): string {
    return `${metadata.commentatorDisplayName} commented your post.`;
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    return metadata.commentBody;
  }

  @FieldResolver(() => String)
  link(@Root() { metadata: { postId, commentId } }: Notification): string {
    return `/posts/${postId}?commentId=${commentId}`;
  }
}
