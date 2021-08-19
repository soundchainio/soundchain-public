import { NotificationType } from 'enums/NotificationType';
import { Comment } from 'models/Comment';
import { CommentNotificationMetadata } from 'models/CommentNotification';
import { Notification, NotificationModel } from 'models/Notification';
import { Post } from 'models/Post';

interface CommentNotificationParams {
  comment: Comment;
  post: Post;
  authorDisplayName: string;
}

export class NotificationService {
  static async notifyNewCommentOnPost({ comment, post, authorDisplayName }: CommentNotificationParams): Promise<void> {
    if (comment.profileId === post.profileId) return;
    const { body: commentBody, _id: commentId } = comment;
    const { _id: postId, profileId: postOwnerProfileId } = post;
    const metadata: CommentNotificationMetadata = {
      author: authorDisplayName,
      commentBody,
      postId,
      commentId,
    };
    const notification = new NotificationModel({
      type: NotificationType.Comment,
      profileId: postOwnerProfileId,
      metadata,
    });
    notification.save();
  }

  static async getNotifications(profileId: string): Promise<Notification[]> {
    return NotificationModel.find({ profileId }).sort({ createdAt: 'desc' }).exec();
  }

  static async getNotification(notificationId: string, profileId: string): Promise<Notification> {
    const notification = await NotificationModel.findOne({ _id: notificationId, profileId });
    if (!notification) throw Error(`Notification with ${notificationId} not found.`);
    return notification;
  }
}
