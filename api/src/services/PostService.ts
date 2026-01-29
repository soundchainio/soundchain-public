import mongoose from 'mongoose';
import { UserInputError } from 'apollo-server-express';
import { PaginateResult } from '../db/pagination/paginate';
import { Post, PostModel } from '../models/Post';
import { Context } from '../types/Context';
import { FilterPostInput } from '../types/FilterPostInput';
import { PageInput } from '../types/PageInput';
import { ReactionType } from '../types/ReactionType';
import { SortPostInput } from '../types/SortPostInput';
import { ModelService } from './ModelService';
import { NewReactionParams } from './ReactionService';
import { fetchMediaThumbnail } from '../utils/oEmbed';

interface NewPostParams {
  profileId: string;
  body?: string;
  mediaLink?: string;
  originalMediaLink?: string;
  trackId?: string;
  trackEditionId?: string;
  // Ephemeral media (24h stories)
  uploadedMediaUrl?: string;
  uploadedMediaType?: string;
  uploadedMediaThumbnail?: string;
}

interface GuestPostParams {
  walletAddress: string;
  body?: string;
  mediaLink?: string;
  originalMediaLink?: string;
  // Ephemeral media (24h stories)
  uploadedMediaUrl?: string;
  uploadedMediaType?: string;
  uploadedMediaThumbnail?: string;
}

interface RepostParams {
  profileId: string;
  body: string;
  repostId: string;
}

interface UpdatePostParams {
  profileId: string;
  postId: string;
  body: string;
  mediaLink?: string;
}

interface DeletePostParams {
  profileId: string;
  postId: string;
}

interface MakePostPermanentParams {
  profileId: string;
  postId: string;
  transactionHash: string;
  amountPaid: number;
}

interface RemoveFromPermanentParams {
  profileId: string;
  postId: string;
  transactionHash: string;
}

export class PostService extends ModelService<typeof Post> {
  constructor(context: Context) {
    super(context, PostModel);
  }

  async createPost(params: NewPostParams): Promise<Post> {
    // Fetch thumbnail for media embeds (Spotify, SoundCloud, Bandcamp, etc.)
    // Use originalMediaLink for oEmbed lookups if available (better for platforms like SoundCloud)
    // If uploadedMediaThumbnail is provided (for video uploads), use that instead
    let mediaThumbnail: string | null = params.uploadedMediaThumbnail || null;
    if (!mediaThumbnail && params.mediaLink) {
      mediaThumbnail = await fetchMediaThumbnail(params.mediaLink, params.originalMediaLink);
    }

    // Set ephemeral fields if uploaded media is provided (24h Snapchat-style stories)
    const isEphemeral = !!params.uploadedMediaUrl;
    const mediaExpiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

    const post = new this.model({
      ...params,
      mediaThumbnail,
      isEphemeral,
      mediaExpiresAt,
    });
    await post.save();

    // Only create feed items and notifications if profileId is present (not a guest post without profile)
    if (post.profileId) {
      try {
        this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt });
        this.context.feedService.addPostToFollowerFeeds(post);
        this.context.notificationService.notifyNewPostForSubscribers(post);

        // Log activity for activity feed
        await this.context.activityService.logPosted(
          post.profileId.toString(),
          post._id.toString(),
          post.body,
          !!(post.mediaLink || params.uploadedMediaUrl)
        );
      } catch (feedError) {
        // Log but don't fail the post creation if feed/notification fails
        console.error('[PostService] Error creating feed items or notifications:', feedError);
      }
    }

    // Return plain object for GraphQL serialization (cast through unknown for Typegoose compatibility)
    return post.toObject() as unknown as Post;
  }

  async createRepost(params: RepostParams): Promise<Post> {
    const post = new PostModel(params);
    await post.save();
    this.context.feedService.createFeedItem({ profileId: post.profileId, postId: post._id, postedAt: post.createdAt });
    this.context.feedService.addPostToFollowerFeeds(post);
    return post.toObject() as unknown as Post;
  }

  async deletePost(params: DeletePostParams): Promise<Post> {
    this.context.feedService.deleteItemsByPostId(params.postId);
    const result = await PostModel.findOneAndUpdate(
      { _id: params.postId, profileId: params.profileId },
      { deleted: true },
      { new: true },
    ).lean();
    return result as unknown as Post;
  }

  async deletePostByAdmin(params: DeletePostParams): Promise<Post> {
    this.context.feedService.deleteItemsByPostId(params.postId);
    const deletedPost = await PostModel.findOneAndUpdate({ _id: params.postId }, { deleted: true }, { new: true }).lean();
    this.context.notificationService.notifyPostDeletedByAdmin(deletedPost as unknown as Post);
    return deletedPost as unknown as Post;
  }

  async updatePost(params: UpdatePostParams): Promise<Post> {
    // Fetch thumbnail if media link changed
    let mediaThumbnail: string | null = null;
    if (params.mediaLink) {
      mediaThumbnail = await fetchMediaThumbnail(params.mediaLink);
    }

    const result = await this.model.findOneAndUpdate(
      { _id: params.postId, profileId: params.profileId },
      {
        body: params.body,
        mediaLink: params.mediaLink,
        mediaThumbnail,
      },
      { new: true },
    ).lean();
    return result as unknown as Post;
  }

  getPosts(filter?: FilterPostInput, sort?: SortPostInput, page?: PageInput): Promise<PaginateResult<Post>> {
    return this.paginate({ filter: { ...filter, deleted: false }, sort, page });
  }

  getPost(id: string): Promise<Post> {
    return this.findOrFail(id);
  }

  async addReactionToPost({ profileId, postId, type }: NewReactionParams): Promise<Post> {
    const [post, alreadyReacted] = await Promise.all([
      this.findOrFail(postId.toString()),
      this.context.reactionService.exists({ postId, profileId }),
    ]);

    if (alreadyReacted) throw new UserInputError('You already reacted to the post.');

    await this.context.reactionService.createReaction({ postId, profileId, type });
    await this.model.updateOne({ _id: postId }, { $inc: { [`reactionStats.${type}`]: 1 } });
    post.reactionStats[type]++;
    return post;
  }

  async removeReactionFromPost({ profileId, postId }: { profileId: string; postId: string }): Promise<Post> {
    const post = await this.findOrFail(postId);

    const { type } = await this.context.reactionService.deleteReaction({
      postId: new mongoose.Types.ObjectId(postId),
      profileId: new mongoose.Types.ObjectId(profileId),
    });
    await this.model.updateOne(
      { _id: postId, [`reactionStats.${type}`]: { $gt: 0 } },
      { $inc: { [`reactionStats.${type}`]: -1 } },
    );

    if (post.reactionStats[type] > 0) {
      post.reactionStats[type]--;
    }

    return post;
  }

  async changeReactionToPost({ postId, profileId, type: newType }: NewReactionParams): Promise<Post> {
    const post = await this.findOrFail(postId.toString());

    const { type: oldType } = await this.context.reactionService.updateReaction({ postId, profileId, type: newType });

    await this.model.updateOne(
      { _id: postId, [`reactionStats.${oldType}`]: { $gt: 0 } },
      { $inc: { [`reactionStats.${oldType}`]: -1, [`reactionStats.${newType}`]: 1 } },
    );

    if (post.reactionStats[oldType] > 0) {
      post.reactionStats[oldType]--;
    }

    post.reactionStats[newType]++;
    return post;
  }

  countReposts(postId: string): Promise<number> {
    return PostModel.countDocuments({ repostId: postId }).exec();
  }

  // ============================================
  // GUEST METHODS (wallet-only, no account required)
  // ============================================

  async addGuestReactionToPost({ walletAddress, postId, type }: { walletAddress: string; postId: mongoose.Types.ObjectId; type: ReactionType }): Promise<Post> {
    const [post, alreadyReacted] = await Promise.all([
      this.findOrFail(postId.toString()),
      this.context.reactionService.existsByWallet({ postId, walletAddress }),
    ]);

    if (alreadyReacted) throw new UserInputError('You already reacted to this post.');

    await this.context.reactionService.createGuestReaction({ postId, walletAddress, type });
    await this.model.updateOne({ _id: postId }, { $inc: { [`reactionStats.${type}`]: 1 } });
    post.reactionStats[type]++;
    return post;
  }

  async removeGuestReactionFromPost({ walletAddress, postId }: { walletAddress: string; postId: string }): Promise<Post> {
    const post = await this.findOrFail(postId);

    const { type } = await this.context.reactionService.deleteGuestReaction({
      postId: new mongoose.Types.ObjectId(postId),
      walletAddress,
    });
    await this.model.updateOne(
      { _id: postId, [`reactionStats.${type}`]: { $gt: 0 } },
      { $inc: { [`reactionStats.${type}`]: -1 } },
    );

    if (post.reactionStats[type] > 0) {
      post.reactionStats[type]--;
    }

    return post;
  }

  async createGuestPost(params: GuestPostParams): Promise<Post> {
    // Fetch thumbnail for media embeds (Spotify, SoundCloud, Bandcamp, etc.)
    // Use originalMediaLink for oEmbed lookups if available (better for platforms like SoundCloud)
    // If uploadedMediaThumbnail is provided (for video uploads), use that instead
    let mediaThumbnail: string | null = params.uploadedMediaThumbnail || null;
    if (!mediaThumbnail && params.mediaLink) {
      mediaThumbnail = await fetchMediaThumbnail(params.mediaLink, params.originalMediaLink);
    }

    // Set ephemeral fields if uploaded media is provided (24h Snapchat-style stories)
    const isEphemeral = !!params.uploadedMediaUrl;
    const mediaExpiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

    const post = new this.model({
      ...params,
      walletAddress: params.walletAddress.toLowerCase(),
      isGuest: true,
      mediaThumbnail,
      isEphemeral,
      mediaExpiresAt,
    });
    await post.save();
    return post.toObject() as unknown as Post;
  }

  async deleteGuestPost({ walletAddress, postId }: { walletAddress: string; postId: string }): Promise<Post> {
    const post = await this.model.findOne({ _id: postId, walletAddress: walletAddress.toLowerCase(), isGuest: true });

    if (!post) {
      throw new UserInputError("Can't delete post because it doesn't exist or you don't own it.");
    }

    post.deleted = true;
    await post.save();
    return post.toObject() as unknown as Post;
  }

  async getOriginalFromTrack(trackId: string): Promise<Post> {
    const track = await this.context.trackService.getTrack(trackId);

    const ors: any[] = [{ trackId }];

    if (track.trackEditionId) {
      ors.push({ trackEditionId: track.trackEditionId });
    }

    const result = await this.model
      .findOne({ $or: ors })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return result as unknown as Post;
  }

  // ============================================
  // MAKE POST PERMANENT METHODS
  // ============================================

  async makePostPermanent(params: MakePostPermanentParams): Promise<Post> {
    const post = await this.model.findOne({ _id: params.postId, profileId: params.profileId });

    if (!post) {
      throw new UserInputError("Can't make post permanent because it doesn't exist or you don't own it.");
    }

    if (post.isPermanent) {
      throw new UserInputError('This post is already permanent.');
    }

    // Update post to permanent status
    post.isPermanent = true;
    post.isEphemeral = false;
    post.mediaExpiresAt = undefined;
    post.permanentPrice = params.amountPaid;
    post.permanentTxHash = params.transactionHash;

    await post.save();
    return post.toObject() as unknown as Post;
  }

  async removeFromPermanent(params: RemoveFromPermanentParams): Promise<Post> {
    const post = await this.model.findOne({ _id: params.postId, profileId: params.profileId });

    if (!post) {
      throw new UserInputError("Can't remove post because it doesn't exist or you don't own it.");
    }

    if (!post.isPermanent) {
      throw new UserInputError('This post is not a permanent post.');
    }

    // Soft delete the post
    post.deleted = true;
    await post.save();
    return post.toObject() as unknown as Post;
  }
}
