import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Comment } from '../models/Comment';
import { CommentNotificationMetadata } from '../models/CommentNotification';
import { Notification, NotificationModel } from '../models/Notification';
import { Post } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { Context } from '../types/Context';
import { NotificationType } from '../types/NotificationType';
import { NotificationUnion } from '../types/NotificationUnion';
import { PageInput } from '../types/PageInput';
import { SortNotificationInput } from '../types/SortNotificationInput';
import { ModelService } from './ModelService';

interface CommentNotificationParams {
  comment: Comment;
  post: Post;
  authorProfile: Profile;
}

export class NotificationService extends ModelService<typeof Notification> {
  constructor(context: Context) {
    super(context, NotificationModel);
  }

  async notifyNewCommentOnPost({ comment, post, authorProfile }: CommentNotificationParams): Promise<void> {
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

  async getNotifications(
    profileId: string,
    sort?: SortNotificationInput,
    page?: PageInput,
  ): Promise<PaginateResult<typeof NotificationUnion>> {
    const { pageInfo, nodes } = await this.paginate({ filter: { profileId }, sort, page });
    return { pageInfo, nodes: nodes as unknown as Array<typeof NotificationUnion> };
  }

  async getNotification(notificationId: string): Promise<typeof NotificationUnion> {
    const notification = await this.findOrFail(notificationId);
    if (!notification) throw new NotFoundError('Notification', notificationId);
    return notification as unknown as typeof NotificationUnion;
  }

  async clearNotifications(profileId: string): Promise<boolean> {
    await NotificationModel.deleteMany({ profileId });
    return true;
  }

  async incrementNotificationCount(profileId: string): Promise<void> {
    await ProfileModel.updateOne({ _id: profileId }, { $inc: { notificationCount: 1 } });
  }

  async resetNotificationCount(profileId: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(profileId, { notificationCount: 0 }, { new: true });
    if (!updatedProfile) {
      throw new Error(`Could not update the profile with id: ${profileId}`);
    }
    return updatedProfile;
  }
}
