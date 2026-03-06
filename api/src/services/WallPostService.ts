import { WallPost, WallPostModel } from '../models/WallPost';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';
import { PageInput } from '../types/PageInput';
import { PaginateResult } from '../db/pagination/paginate';
import { SortOrder } from '../types/SortOrder';

export class WallPostService extends ModelService<typeof WallPost> {
  constructor(context: Context) {
    super(context, WallPostModel);
  }

  /**
   * Create a wall post (or reply)
   */
  async createWallPost(
    profileId: string,
    authorProfileId: string,
    body?: string,
    replyToId?: string,
    mediaUrl?: string,
    mediaType?: string,
    coverArtUrl?: string,
    mediaThumbnailUrl?: string,
    mediaTitle?: string,
  ): Promise<WallPost> {
    const wallPost = new WallPostModel({
      profileId,
      authorProfileId,
      body: body ? body.substring(0, 1000) : undefined,
      replyToId,
      mediaUrl,
      mediaType,
      coverArtUrl,
      mediaThumbnailUrl,
      mediaTitle: mediaTitle ? mediaTitle.substring(0, 200) : undefined,
    });
    await wallPost.save();
    return wallPost.toObject() as WallPost;
  }

  /**
   * Get a single wall post by ID (for OG share cards)
   */
  async getWallPost(id: string): Promise<WallPost | null> {
    const post = await WallPostModel.findById(id).lean();
    if (!post || post.deleted) return null;
    return post as unknown as WallPost;
  }

  /**
   * Get wall posts for a profile, paginated, pinned first
   */
  async getWallPosts(profileId: string, page?: PageInput): Promise<PaginateResult<WallPost>> {
    return this.paginate({
      filter: {
        profileId,
        deleted: false,
        replyToId: { $exists: false },
      } as any,
      sort: { field: 'createdAt' as any, order: SortOrder.DESC },
      page: page || { first: 20 },
    });
  }

  /**
   * Soft-delete a wall post (author or wall owner can delete)
   */
  async deleteWallPost(wallPostId: string, requestingProfileId: string): Promise<boolean> {
    const post = await WallPostModel.findById(wallPostId).lean();
    if (!post) return false;

    // Only author or wall owner can delete
    if (post.authorProfileId !== requestingProfileId && post.profileId !== requestingProfileId) {
      throw new Error('Not authorized to delete this wall post');
    }

    await WallPostModel.updateOne({ _id: wallPostId }, { deleted: true });
    return true;
  }

  /**
   * Toggle pin on a wall post (wall owner only, max 3 pinned)
   */
  async pinWallPost(wallPostId: string, requestingProfileId: string): Promise<WallPost> {
    const post = await WallPostModel.findById(wallPostId).lean();
    if (!post) throw new Error('Wall post not found');
    if (post.profileId !== requestingProfileId) {
      throw new Error('Only the wall owner can pin posts');
    }

    const newPinned = !post.pinned;

    if (newPinned) {
      // Check max 3 pinned posts
      const pinnedCount = await WallPostModel.countDocuments({
        profileId: post.profileId,
        pinned: true,
        deleted: false,
      });
      if (pinnedCount >= 3) {
        throw new Error('Maximum 3 pinned posts allowed');
      }
    }

    await WallPostModel.updateOne({ _id: wallPostId }, { pinned: newPinned });
    const updated = await WallPostModel.findById(wallPostId).lean();
    return updated as unknown as WallPost;
  }

  /**
   * Get replies to a wall post
   */
  async getReplies(wallPostId: string): Promise<WallPost[]> {
    const replies = await WallPostModel.find({
      replyToId: wallPostId,
      deleted: false,
    })
      .sort({ createdAt: 1 })
      .lean();
    return replies as unknown as WallPost[];
  }

  /**
   * Count replies to a wall post
   */
  async getReplyCount(wallPostId: string): Promise<number> {
    return WallPostModel.countDocuments({
      replyToId: wallPostId,
      deleted: false,
    });
  }

  /**
   * Update a wall post's body (author only)
   */
  async updateWallPost(wallPostId: string, requestingProfileId: string, body: string): Promise<WallPost> {
    const post = await WallPostModel.findById(wallPostId).lean();
    if (!post) throw new Error('Wall post not found');
    if (post.deleted) throw new Error('Wall post not found');

    if (post.authorProfileId !== requestingProfileId) {
      throw new Error('Only the author can edit this wall post');
    }

    await WallPostModel.updateOne(
      { _id: wallPostId },
      { body: body.substring(0, 1000) },
    );
    const updated = await WallPostModel.findById(wallPostId).lean();
    return updated as unknown as WallPost;
  }
}
