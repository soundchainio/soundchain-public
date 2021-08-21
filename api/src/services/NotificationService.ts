import { NotificationType } from 'enums/NotificationType';
import { NotFoundError } from 'errors/NotFoundError';
import { Comment } from 'models/Comment';
import { CommentNotificationMetadata } from 'models/CommentNotification';
import { NotificationModel } from 'models/Notification';
import { Post } from 'models/Post';
import { Profile } from 'models/Profile';
import { NotificationUnion } from 'resolvers/NotificationResolver';
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
    const { displayName: authorName, profilePicture: authorPicture } = authorProfile;
    const metadata: CommentNotificationMetadata = {
      authorName,
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

  static async getNotifications(profileId: string): Promise<Array<typeof NotificationUnion>> {
    const notifications = NotificationModel.find({ profileId }).sort({ createdAt: 'desc' }).exec();
    return notifications as unknown as Array<typeof NotificationUnion>;
  }

  static async getNotification(notificationId: string, profileId: string): Promise<typeof NotificationUnion> {
    const notification = await NotificationModel.findOne({ _id: notificationId, profileId });
    if (!notification) throw new NotFoundError('Notification', notificationId);
    return notification as unknown as typeof NotificationUnion;
  }

  static async clearNotifications(profileId: string): Promise<boolean> {
    await NotificationModel.deleteMany({ profileId });
    return true;
  }
}
