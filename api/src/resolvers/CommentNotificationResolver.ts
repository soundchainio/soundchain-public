import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { CommentNotification } from '../types/CommentNotification';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { Context } from '../types/Context';

@Resolver(CommentNotification)
export class CommentNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  authorName(@Root() { metadata }: Notification): string {
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
    return 'commented on your post:';
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { commentBody } = metadata as CommentNotificationMetadata;
    return commentBody;
  }

  @FieldResolver(() => String)
  async link(@Root() { metadata }: Notification, @Ctx() { commentService }: Context): Promise<string> {
    const { postId, commentId } = metadata as CommentNotificationMetadata;
    const cursor = await commentService.getPageCursorById(commentId.toString(), 'createdAt');
    return `/posts/${postId.toString()}?commentId=${commentId.toString()}&cursor=${cursor}`;
  }
}
