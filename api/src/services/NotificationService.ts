import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Comment } from '../models/Comment';
import { Follow } from '../models/Follow';
import { Notification, NotificationModel } from '../models/Notification';
import { Post } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { Reaction } from '../models/Reaction';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { Context } from '../types/Context';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { NotificationUnion } from '../types/NotificationUnion';
import { PageInput } from '../types/PageInput';
import { SortNotificationInput } from '../types/SortNotificationInput';
import { ModelService } from './ModelService';

interface CommentNotificationParams {
  comment: Comment;
  post: Post;
  authorProfileId: string;
}

export class NotificationService extends ModelService<typeof Notification> {
  constructor(context: Context) {
    super(context, NotificationModel);
  }

  async notifyNewCommentOnPost({ comment, post, authorProfileId }: CommentNotificationParams): Promise<void> {
    const authorProfile = await this.context.profileService.getProfile(authorProfileId);
    const { body: commentBody, _id: commentId } = comment;
    const { _id: postId, profileId } = post;
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
      profileId,
      metadata,
    });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  async notifyNewReaction({ postId, profileId, type: reactionType }: Reaction): Promise<void> {
    const [{ profileId: postProfileId }, { displayName: authorName, profilePicture: authorPicture }] =
      await Promise.all([this.context.postService.getPost(postId), this.context.profileService.getProfile(profileId)]);

    const notification = new NotificationModel({
      type: NotificationType.Reaction,
      profileId: postProfileId,
      metadata: {
        authorName,
        authorPicture,
        postId,
        reactionType,
      },
    });

    await notification.save();
    await this.incrementNotificationCount(postProfileId);
  }

  async notifyNewFollower({ followerId, followedId: profileId }: Follow): Promise<void> {
    const { displayName: followerName, profilePicture: followerPicture } = await this.context.profileService.getProfile(
      followerId,
    );
    const notification = new NotificationModel({
      type: NotificationType.Follower,
      profileId,
      metadata: {
        followerId,
        followerName,
        followerPicture,
      },
    });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  async getNotifications(
    profileId: string,
    sort?: SortNotificationInput,
    page?: PageInput,
  ): Promise<PaginateResult<typeof NotificationUnion>> {
    const { pageInfo, nodes } = await this.paginate({ filter: { profileId }, sort, page });
    return { pageInfo, nodes: nodes as Array<typeof NotificationUnion> };
  }

  async getNotification(notificationId: string): Promise<typeof NotificationUnion> {
    const notification = await this.findOrFail(notificationId);
    return notification as typeof NotificationUnion;
  }

  async clearNotifications(profileId: string): Promise<boolean> {
    await NotificationModel.deleteMany({ profileId });
    return true;
  }

  async incrementNotificationCount(profileId: string): Promise<void> {
    await ProfileModel.updateOne({ _id: profileId }, { $inc: { unreadNotificationCount: 1 } });
  }

  async resetNotificationCount(profileId: string): Promise<Profile> {
    const updatedProfile = await ProfileModel.findByIdAndUpdate(
      profileId,
      { unreadNotificationCount: 0 },
      { new: true },
    );
    if (!updatedProfile) {
      throw new NotFoundError('Profile', profileId);
    }
    return updatedProfile;
  }

  async notifyNewPostForSubscribers(post: Post): Promise<void> {
    const authorProfile = await this.context.profileService.getProfile(post.profileId);
    const subscribersIds = await this.context.subscriptionService.getSubscriberIds(post.profileId);
    const metadata: NewPostNotificationMetadata = {
      authorName: authorProfile.displayName,
      authorPicture: authorProfile.profilePicture,
      postBody: post.body,
      postId: post._id,
      postLink: post.mediaLink,
      trackId: post.trackId,
    };
    const notifications = subscribersIds.map(
      profileId => new this.model({ type: NotificationType.NewPost, profileId, metadata })
    );
    console.log('subscribers ids:', subscribersIds);
    await ProfileModel.updateMany({ _id: { $in: subscribersIds } }, { $inc: { unreadNotificationCount: 1 } });
    await this.model.insertMany(notifications);
  }
}
