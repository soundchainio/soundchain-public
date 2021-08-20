import { NotificationType } from 'enums/NotificationType';
import { Comment } from 'models/Comment';
import { CommentNotificationMetadata } from 'models/CommentNotification';
import { Notification, NotificationModel } from 'models/Notification';
import { Post } from 'models/Post';
import { Profile } from 'models/Profile';
import { ProfileService } from './ProfileService';

interface CommentNotificationParams {
  comment: Comment;
  post: Post;
  authorProfile: Profile;
}

export class NotificationService {
  static async notifyNewCommentOnPost({ comment, post, authorProfile }: CommentNotificationParams): Promise<void> {
    if (comment.profileId === post.profileId) return;
    const { body: commentBody, _id: commentId } = comment;
    const { _id: postId, profileId: postOwnerProfileId } = post;
    const { displayName, profilePicture: authorPicture } = authorProfile;
    const metadata: CommentNotificationMetadata = {
      author: displayName,
      commentBody,
      postId,
      commentId,
      authorPicture,
    };
    const notification = new NotificationModel({
      type: NotificationType.Comment,
      profileId: postOwnerProfileId,
      metadata,
    });
    await notification.save();
    await ProfileService.incrementNotificationCount(postOwnerProfileId);
  }

  static async getNotifications(profileId: string): Promise<Notification[]> {
    return NotificationModel.find({ profileId }).sort({ createdAt: 'desc' }).exec();
  }

  static async getNotification(notificationId: string, profileId: string): Promise<Notification> {
    const notification = await NotificationModel.findOne({ _id: notificationId, profileId });
    if (!notification) throw Error(`Notification with ${notificationId} not found.`);
    return notification;
  }

  static async clearNotifications(profileId: string): Promise<boolean> {
    await NotificationModel.deleteMany({ profileId });
    return true;
  }
}
