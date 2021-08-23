import { NotFoundError } from '../errors/NotFoundError';
import { Comment } from '../models/Comment';
import { CommentNotificationMetadata } from '../models/CommentNotification';
import { NotificationModel } from '../models/Notification';
import { Post } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { NotificationUnion } from '../resolvers/NotificationResolver';
import { NotificationType } from '../types/NotificationType';

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
    await this.incrementNotificationCount(postOwnerProfileId);
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

  static async incrementNotificationCount(profileId: string): Promise<void> {
    await ProfileModel.updateOne({ _id: profileId }, { $inc: { notificationCount: 1 } });
  }

  static async resetNotificationCount(profileId: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(profileId, { notificationCount: 0 }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${profileId}`);
    }
    return updatedProfile;
  }
}
