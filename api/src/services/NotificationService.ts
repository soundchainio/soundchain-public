import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Comment } from '../models/Comment';
import { Follow } from '../models/Follow';
import { Notification, NotificationModel } from '../models/Notification';
import { Post } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { Reaction } from '../models/Reaction';
import { Track } from '../models/Track';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { Context } from '../types/Context';
import { DeletedPostNotificationMetadata } from '../types/DeletedPostNotificationMetadata';
import { FinishBuyNowItemInput } from '../types/FinishBuyNowItemInput';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NewVerificationRequestNotificationMetadata } from '../types/NewVerificationRequestNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { NotificationUnion } from '../types/NotificationUnion';
import { PageInput } from '../types/PageInput';
import { SortNotificationInput } from '../types/SortNotificationInput';
import { TrackWithPriceMetadata } from '../types/TrackWithPriceMetadata';
import { ModelService } from './ModelService';

interface CommentNotificationParams {
  comment: Comment;
  post: Post;
  authorProfileId: string;
}

interface AuctionParams {
  track: Track;
  price: number;
  profileId: string;
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
    const followerHandle = await this.context.profileService.getUserHandle(followerId);
    const notification = new NotificationModel({
      type: NotificationType.Follower,
      profileId,
      metadata: {
        followerId,
        followerName,
        followerPicture,
        followerHandle,
      },
    });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  async notifyNFTSold({
    sellerProfileId,
    buyerProfileId,
    price,
    trackId,
    artist,
    artworkUrl,
    trackName,
    sellType,
  }: Omit<FinishBuyNowItemInput, 'tokenId'>): Promise<void> {
    const { displayName: buyerName, profilePicture: buyerPicture } = await this.context.profileService.getProfile(
      buyerProfileId,
    );
    const notification = new NotificationModel({
      type: NotificationType.NFTSold,
      profileId: sellerProfileId,
      metadata: {
        buyerProfileId,
        trackId,
        price,
        buyerName,
        buyerPicture,
        artist,
        artworkUrl,
        trackName,
        sellType,
      },
    });
    await notification.save();
    await this.incrementNotificationCount(sellerProfileId);
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
      profileId => new this.model({ type: NotificationType.NewPost, profileId, metadata }),
    );
    await ProfileModel.updateMany({ _id: { $in: subscribersIds } }, { $inc: { unreadNotificationCount: 1 } });
    await this.model.insertMany(notifications);
  }

  async notifyVerificationRequestUpdate(profileId: string): Promise<void> {
    const notification = new NotificationModel({
      type: NotificationType.VerificationRequestUpdate,
      profileId: profileId,
      metadata: {
        body: 'Your verification request has been updated!',
      },
    });

    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  async newVerificationRequest(verificationRequestId: string): Promise<void> {
    const adminsIds = await this.context.userService.getAdminsProfileIds();
    const metadata: NewVerificationRequestNotificationMetadata = {
      verificationRequestId,
    };

    const notifications = adminsIds.map(
      profileId => new this.model({ type: NotificationType.NewVerificationRequest, profileId, metadata }),
    );

    await ProfileModel.updateMany({ _id: { $in: adminsIds } }, { $inc: { unreadNotificationCount: 1 } });
    await this.model.insertMany(notifications);
  }

  async deleteNotificationsByVerificationRequestId(verificationRequestId: string): Promise<void> {
    await this.model.deleteMany({ 'metadata.verificationRequestId': verificationRequestId });
  }

  async notifyPostDeletedByAdmin(post: Post): Promise<void> {
    const { profileId } = post;
    const authorProfile = await this.context.profileService.getProfile(profileId);
    const metadata: DeletedPostNotificationMetadata = {
      authorName: authorProfile.displayName,
      authorPicture: authorProfile.profilePicture,
      postBody: post.body,
      postId: post._id,
      postLink: post.mediaLink,
      trackId: post.trackId,
    };
    const notification = new NotificationModel({ type: NotificationType.DeletedPost, profileId, metadata });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  async notifyCommentDeletedByAdmin({ comment, post, authorProfileId }: CommentNotificationParams): Promise<void> {
    const authorProfile = await this.context.profileService.getProfile(authorProfileId);
    const { body: commentBody, _id: commentId } = comment;
    const { _id: postId } = post;

    const { displayName: authorName, profilePicture: authorPicture } = authorProfile;
    const metadata: CommentNotificationMetadata = {
      authorName,
      commentBody,
      postId,
      commentId,
      authorPicture,
    };
    const notification = new NotificationModel({
      type: NotificationType.DeletedComment,
      profileId: authorProfileId,
      metadata,
    });
    await notification.save();
    await this.incrementNotificationCount(authorProfileId);
  }

  async notifyWonAuction({ track, price, profileId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price }, NotificationType.WonAuction);
  }

  async notifyAuctionIsEnding({ track, profileId, price }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price }, NotificationType.AuctionIsEnding);
  }

  async notifyOutbid({ track, profileId, price }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price }, NotificationType.Outbid);
  }

  async notifyNewBid({ track, profileId, price }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price }, NotificationType.NewBid);
  }

  private async notifyTrack({ track, profileId, price }: AuctionParams, type: NotificationType): Promise<void> {
    const { _id: trackId, artist, artworkUrl, title: trackName } = track;
    const metadata: TrackWithPriceMetadata = {
      trackId,
      trackName,
      artist,
      artworkUrl,
      price,
    };
    const notification = new NotificationModel({
      type,
      profileId,
      metadata,
    });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }
}
