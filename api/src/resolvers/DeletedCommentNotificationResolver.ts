import { Ctx, FieldResolver, Resolver, Root } from 'type-graphql';
import { Notification } from '../models/Notification';
import { DeletedCommentNotification } from '../types/DeletedCommentNotification';
import { DeletedCommentNotificationMetadata } from '../types/DeletedCommentNotificationMetadata';
import { Context } from '../types/Context';

@Resolver(DeletedCommentNotification)
export class DeletedCommentNotificationResolver {
  @FieldResolver(() => String)
  id(@Root() { _id }: Notification): string {
    return _id.toString();
  }

  @FieldResolver(() => String)
  authorName(@Root() { metadata }: Notification): string {
    const { authorName } = metadata as DeletedCommentNotificationMetadata;
    return authorName;
  }

  @FieldResolver(() => String, { nullable: true })
  authorPicture(@Root() { metadata }: Notification): string | undefined {
    const { authorPicture } = metadata as DeletedCommentNotificationMetadata;
    return authorPicture;
  }

  @FieldResolver(() => String)
  body(): string {
    return 'commented on your post:';
  }

  @FieldResolver(() => String)
  previewBody(@Root() { metadata }: Notification): string {
    const { commentBody } = metadata as DeletedCommentNotificationMetadata;
    return commentBody;
  }

  @FieldResolver(() => String)
  async link(@Root() { metadata }: Notification, @Ctx() { commentService }: Context): Promise<string> {
    const { postId, commentId } = metadata as DeletedCommentNotificationMetadata;
    const cursor = await commentService.getPageCursorById(commentId.toString(), 'createdAt');
    return `/posts/${postId.toString()}?commentId=${commentId.toString()}&cursor=${cursor}`;
  }
}
