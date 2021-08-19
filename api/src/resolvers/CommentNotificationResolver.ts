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
  author(@Root() { metadata }: Notification): string {
    return metadata.author;
  }

  @FieldResolver(() => String)
  body(): string {
    return `commented your post:`;
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
