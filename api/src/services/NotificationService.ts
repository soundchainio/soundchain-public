import mongoose from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { NotFoundError } from '../errors/NotFoundError';
import { Comment } from '../models/Comment';
import { Follow } from '../models/Follow';
import { Notification, NotificationModel } from '../models/Notification';
import { Post } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { Reaction } from '../models/Reaction'; // Fixed import path
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
  auctionId: string;
}

interface AuctionIsOverParams {
  track: Track;
  price: number;
  buyerProfileId?: string | undefined;
  sellerProfileId?: string | undefined;
  auctionId: string;
}

export class NotificationService extends ModelService<typeof Notification> {
  constructor(context: Context) {
    super(context, NotificationModel);
  }

  async notifyNewCommentOnPost({ comment, post, authorProfileId }: CommentNotificationParams): Promise<void> {
    // Validate all required data before proceeding
    if (!comment || !post || !authorProfileId) {
      console.warn('[NotificationService] Skipping comment notification - missing required data');
      return;
    }

    // Get post's profile ID - skip if post has no profile (guest post)
    const postProfileId = post.profileId;
    if (!postProfileId) {
      console.warn('[NotificationService] Skipping comment notification - post has no profile');
      return;
    }

    const authorProfile = await this.context.profileService.getProfile(authorProfileId);
    if (!authorProfile) {
      console.warn('[NotificationService] Skipping comment notification - author profile not found');
      return;
    }

    const commentBody = comment.body;
    const commentId = comment._id;
    const postId = post._id;
    const authorName = authorProfile.displayName || 'Unknown';
    const authorPicture = authorProfile.profilePicture;

    const metadata: CommentNotificationMetadata = {
      authorName,
      commentBody,
      postId,
      commentId,
      authorPicture,
    };

    const notification = new NotificationModel({
      type: NotificationType.Comment,
      profileId: postProfileId.toString(),
      metadata,
    });
    await notification.save();
    await this.incrementNotificationCount(postProfileId.toString());

    // Send web push notification
    await this.context.webPushService.notifyNewComment(
      postProfileId.toString(),
      authorName,
      post._id.toString()
    );
  }

  async notifyNewReaction({ postId, profileId, type: reactionType }: Reaction): Promise<void> {
    // Skip notification if postId or profileId is missing
    if (!postId || !profileId) {
      console.warn('[NotificationService] Skipping reaction notification - missing postId or profileId');
      return;
    }

    const [post, authorProfile] =
      await Promise.all([
        this.context.postService.getPost(postId.toString()),
        this.context.profileService.getProfile(profileId.toString()),
      ]);

    // Skip if post or author profile not found
    if (!post || !authorProfile) {
      console.warn('[NotificationService] Skipping reaction notification - post or author not found');
      return;
    }

    const { profileId: postProfileId } = post;
    const { displayName: authorName, profilePicture: authorPicture } = authorProfile;

    const metadata = {
      authorName,
      authorPicture,
      postId,
      reactionType,
    };

    const notification = new NotificationModel({
      type: NotificationType.Reaction,
      profileId: postProfileId.toString(),
      metadata,
    });

    await notification.save();
    await this.incrementNotificationCount(postProfileId.toString());

    // Send web push notification
    await this.context.webPushService.notifyNewLike(
      postProfileId.toString(),
      authorName,
      postId.toString()
    );
  }

  async notifyNewFollower({ followerId, followedId }: Follow): Promise<void> {
    if (!followerId || !followedId) {
      console.warn('[NotificationService] Skipping follower notification - missing followerId or followedId');
      return;
    }

    try {
      const followerProfile = await this.context.profileService.getProfile(followerId.toString());
      if (!followerProfile) {
        console.warn('[NotificationService] Skipping follower notification - follower profile not found');
        return;
      }

      const followerHandle = await this.context.profileService.getUserHandle(followerId.toString());
      const notification = new NotificationModel({
        type: NotificationType.Follower,
        profileId: followedId.toString(),
        metadata: {
          followerId,
          followerName: followerProfile.displayName || 'Unknown',
          followerPicture: followerProfile.profilePicture,
          followerHandle,
        },
      });
      await notification.save();
      await this.incrementNotificationCount(followedId.toString());

      // Send web push notification
      await this.context.webPushService.notifyNewFollower(
        followedId.toString(),
        followerProfile.displayName || 'Someone',
        followerHandle
      );
    } catch (err) {
      console.error('[NotificationService] Error in notifyNewFollower:', err);
    }
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
    isPaymentOgun,
  }: Omit<FinishBuyNowItemInput, 'tokenId'>): Promise<void> {
    if (!sellerProfileId || !buyerProfileId) {
      console.warn('[NotificationService] Skipping NFT sold notification - missing profile IDs');
      return;
    }

    try {
      const buyer = await this.context.profileService.getProfile(buyerProfileId.toString());
      const seller = await this.context.profileService.getProfile(sellerProfileId.toString());

      if (!buyer || !seller) {
        console.warn('[NotificationService] Skipping NFT sold notification - buyer or seller profile not found');
        return;
      }

      const notification = new NotificationModel({
        type: NotificationType.NFTSold,
        profileId: sellerProfileId.toString(),
        metadata: {
          buyerProfileId,
          trackId,
          price,
          buyerName: buyer.displayName || 'Unknown',
          buyerPicture: buyer.profilePicture,
          artist,
          artworkUrl,
          trackName,
          sellType,
          isPaymentOgun,
        },
      });

      const trackUrl = `https://www.soundchain.io/tracks/${trackId}`;
      const buyerProfileUrl = `https://www.soundchain.io/profiles/${buyer.displayName}`;
      const sendTo = ['admin@soundchain.io'];

      await Promise.all(
        sendTo.map(email =>
          this.context.mailchimpService.sendTemplateEmail(email, 'nft-minted', {
            subject: 'NFT Minted',
            buyer_name: buyer.displayName || 'Unknown',
            buyer_profile_link: buyerProfileUrl,
            email_receiver_name: 'Frank',
            track_name: trackName,
            track_details_link: trackUrl,
            track_src: artworkUrl,
            nft_owner_name: seller.displayName || 'Unknown',
          }),
        ),
      );

      await notification.save();
      await this.incrementNotificationCount(sellerProfileId.toString());
    } catch (err) {
      console.error('[NotificationService] Error in notifyNFTSold:', err);
    }
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
    // Guard against undefined post or profileId
    if (!post?.profileId) {
      console.warn('[NotificationService] Skipping notifyNewPostForSubscribers - post or profileId is undefined');
      return;
    }

    try {
      const authorProfile = await this.context.profileService.getProfile(post.profileId.toString());
      if (!authorProfile) {
        console.warn('[NotificationService] Author profile not found for post notifications');
        return;
      }

      const subscribersIds = await this.context.subscriptionService.getSubscriberIds(post.profileId.toString());
      if (!subscribersIds.length) return; // No subscribers to notify

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
    } catch (error) {
      console.error('[NotificationService] Error in notifyNewPostForSubscribers:', error);
    }
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
    if (!post || !post.profileId) {
      console.warn('[NotificationService] Skipping post deleted notification - missing post or profileId');
      return;
    }

    try {
      const { profileId } = post;
      const authorProfile = await this.context.profileService.getProfile(profileId.toString());

      if (!authorProfile) {
        console.warn('[NotificationService] Skipping post deleted notification - author profile not found');
        return;
      }

      const metadata: DeletedPostNotificationMetadata = {
        authorName: authorProfile.displayName || 'Unknown',
        authorPicture: authorProfile.profilePicture,
        postBody: post.body,
        postId: post._id,
        postLink: post.mediaLink,
        trackId: post.trackId,
      };
      const notification = new NotificationModel({ type: NotificationType.DeletedPost, profileId, metadata });
      await notification.save();
      await this.incrementNotificationCount(profileId.toString());
    } catch (err) {
      console.error('[NotificationService] Error in notifyPostDeletedByAdmin:', err);
    }
  }

  async notifyCommentDeletedByAdmin({ comment, post, authorProfileId }: CommentNotificationParams): Promise<void> {
    if (!comment || !post || !authorProfileId) {
      console.warn('[NotificationService] Skipping comment deleted notification - missing required data');
      return;
    }

    try {
      const authorProfile = await this.context.profileService.getProfile(authorProfileId);

      if (!authorProfile) {
        console.warn('[NotificationService] Skipping comment deleted notification - author profile not found');
        return;
      }

      const { body: commentBody, _id: commentId } = comment;
      const { _id: postId } = post;

      const metadata: CommentNotificationMetadata = {
        authorName: authorProfile.displayName || 'Unknown',
        commentBody,
        postId,
        commentId,
        authorPicture: authorProfile.profilePicture,
      };
      const notification = new NotificationModel({
        type: NotificationType.DeletedComment,
        profileId: authorProfileId,
        metadata,
      });
      await notification.save();
      await this.incrementNotificationCount(authorProfileId);
    } catch (err) {
      console.error('[NotificationService] Error in notifyCommentDeletedByAdmin:', err);
    }
  }

  async notifyWonAuction({ track, price, profileId, auctionId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price, auctionId }, NotificationType.WonAuction);
  }

  async notifyAuctionIsEnding({ track, profileId, price, auctionId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price, auctionId }, NotificationType.AuctionIsEnding);
  }

  async notifyOutbid({ track, profileId, price, auctionId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price, auctionId }, NotificationType.Outbid);
  }

  async notifyNewBid({ track, profileId, price, auctionId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price, auctionId }, NotificationType.NewBid);
  }

  async notifyAuctionEnded({ track, profileId, price, auctionId }: AuctionParams): Promise<void> {
    this.notifyTrack({ track, profileId, price, auctionId }, NotificationType.AuctionEnded);
  }

  async notifyAuctionIsOver({
    track,
    price,
    buyerProfileId,
    sellerProfileId,
    auctionId,
  }: AuctionIsOverParams): Promise<void> {
    const promises = [];
    if (sellerProfileId) {
      promises.push(this.notifyAuctionEnded({ track, price, profileId: sellerProfileId, auctionId }));
    }
    if (buyerProfileId) {
      promises.push(this.notifyWonAuction({ track, price, profileId: buyerProfileId, auctionId }));
    }
    await Promise.all(promises);
  }

  private async notifyTrack(
    { track, profileId, price, auctionId }: AuctionParams,
    type: NotificationType,
  ): Promise<void> {
    const { _id: trackId, artist, artworkUrl, title: trackName } = track;
    const metadata: TrackWithPriceMetadata = {
      trackId,
      trackName,
      artist,
      artworkUrl,
      price,
      auctionId,
    };
    const notification = new NotificationModel({
      type,
      profileId,
      metadata,
    });
    await notification.save();
    await this.incrementNotificationCount(profileId);
  }

  // ============================================
  // WIN-WIN OGUN REWARD NOTIFICATIONS
  // ============================================

  /**
   * Create notification when user earns OGUN from streaming rewards
   *
   * WIN-WIN model: Both creators and listeners get notified!
   */
  async createOgunEarnedNotification(params: {
    profileId: string;
    amount: number;
    trackTitle: string;
    trackId: string;
    isCreator: boolean;
    listenerName?: string;
    creatorName?: string;
  }): Promise<void> {
    const { profileId, amount, trackTitle, trackId, isCreator, listenerName, creatorName } = params;

    // Skip tiny amounts to reduce notification spam
    if (amount < 0.001) return;

    const type = isCreator
      ? NotificationType.OgunEarnedCreator
      : NotificationType.OgunEarnedListener;

    const metadata = {
      amount: amount.toFixed(4),
      trackTitle,
      trackId,
      isCreator,
      listenerName: listenerName || 'Someone',
      creatorName: creatorName || 'Unknown Artist',
      timestamp: new Date().toISOString(),
    };

    const notification = new NotificationModel({
      type,
      profileId,
      metadata,
    });

    await notification.save();
    await this.incrementNotificationCount(profileId);

    console.log(`[NotificationService] OGUN earned notification: ${isCreator ? 'Creator' : 'Listener'} ${profileId} earned ${amount.toFixed(4)} OGUN`);
  }

  /**
   * Create notification for collaborator who earned OGUN from royalty split
   */
  async createCollaboratorOgunNotification(params: {
    profileId: string;
    walletAddress: string;
    amount: number;
    trackTitle: string;
    trackId: string;
    creatorName: string;
    role?: string;
  }): Promise<void> {
    const { profileId, walletAddress, amount, trackTitle, trackId, creatorName, role } = params;

    if (amount < 0.001) return;

    const metadata = {
      amount: amount.toFixed(4),
      trackTitle,
      trackId,
      creatorName,
      walletAddress,
      role: role || 'Collaborator',
      timestamp: new Date().toISOString(),
    };

    const notification = new NotificationModel({
      type: NotificationType.OgunEarnedCollaborator,
      profileId,
      metadata,
    });

    await notification.save();
    await this.incrementNotificationCount(profileId);
  }
}
