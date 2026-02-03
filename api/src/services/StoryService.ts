import mongoose from 'mongoose';
import { UserInputError } from 'apollo-server-express';
import { Story, StoryModel } from '../models/Story';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

interface CreateStoryParams {
  profileId: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  duration?: number;
}

interface CreateGuestStoryParams {
  walletAddress: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  duration?: number;
}

interface AddReactionParams {
  storyId: string;
  profileId: string;
  emoji: string;
}

interface MakePermanentParams {
  storyId: string;
  txHash: string;
  paymentToken?: string;
  amountPaid?: number;
}

const STORY_EXPIRY_HOURS = 24;

export class StoryService extends ModelService<typeof Story> {
  constructor(context: Context) {
    super(context, StoryModel);
  }

  /**
   * Create a new story with 24hr expiry
   */
  async create(params: CreateStoryParams): Promise<Story> {
    const { profileId, mediaUrl, mediaType, caption, duration } = params;

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);

    const story = new StoryModel({
      profileId: new mongoose.Types.ObjectId(profileId),
      mediaUrl,
      mediaType,
      caption,
      duration: duration || (mediaType === 'video' ? undefined : 60), // Default 60s for images
      expiresAt,
      isPermanent: false,
      viewCount: 0,
      reactions: [],
      viewerIds: [],
      deleted: false,
    });

    await story.save();

    // Log activity for activity feed
    try {
      await this.context.activityService.logPosted(
        profileId,
        story._id.toString(),
        caption || 'shared a story',
        true // hasMedia
      );
    } catch (err) {
      console.error('[StoryService] Failed to log story activity:', err);
    }

    return story.toObject() as unknown as Story;
  }

  /**
   * Get a story by ID
   */
  async getById(id: string): Promise<Story> {
    return this.findOrFail(id);
  }

  /**
   * Get user's active (non-expired) stories
   */
  async getByProfile(profileId: string): Promise<Story[]> {
    const now = new Date();
    const stories = await StoryModel.find({
      profileId: new mongoose.Types.ObjectId(profileId),
      deleted: false,
      $or: [
        { expiresAt: { $gt: now } }, // Not expired
        { isPermanent: true }, // Or permanent
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Get stories from users this profile follows
   */
  async getFollowingStories(profileId: string): Promise<Story[]> {
    const now = new Date();

    // Get list of followed profile IDs
    const followedIds = await this.context.followService.getFollowedIds(profileId);

    if (followedIds.length === 0) {
      return [];
    }

    // Convert to ObjectIds
    const followedObjectIds = followedIds.map(id => new mongoose.Types.ObjectId(id));

    // Get stories from followed users that are still active
    const stories = await StoryModel.find({
      profileId: { $in: followedObjectIds },
      deleted: false,
      $or: [
        { expiresAt: { $gt: now } }, // Not expired
        { isPermanent: true }, // Or permanent
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Get recent public stories for non-logged-in users
   */
  async getPublicStories(limit: number = 20): Promise<Story[]> {
    const now = new Date();

    const stories = await StoryModel.find({
      deleted: false,
      $or: [
        { expiresAt: { $gt: now } }, // Not expired
        { isPermanent: true }, // Or permanent
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Increment view count and optionally track viewer
   */
  async incrementViewCount(storyId: string, viewerProfileId?: string): Promise<Story> {
    const update: any = { $inc: { viewCount: 1 } };

    // Track unique viewers if viewerProfileId provided
    if (viewerProfileId) {
      update.$addToSet = { viewerIds: new mongoose.Types.ObjectId(viewerProfileId) };
    }

    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      update,
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    return story as unknown as Story;
  }

  /**
   * Add a reaction to a story
   */
  async addReaction(params: AddReactionParams): Promise<Story> {
    const { storyId, profileId, emoji } = params;

    // Check if user already reacted with this emoji
    const existingStory = await StoryModel.findOne({
      _id: storyId,
      'reactions.profileId': new mongoose.Types.ObjectId(profileId),
      'reactions.emoji': emoji,
    });

    if (existingStory) {
      throw new UserInputError('You already reacted with this emoji');
    }

    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      {
        $push: {
          reactions: {
            profileId: new mongoose.Types.ObjectId(profileId),
            emoji,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    return story as unknown as Story;
  }

  /**
   * Generate a unique SCid for a permanent story
   * Format: SR-POL-XXXX-XXXXXX (Story Reel + Chain + ArtistHash + Sequence)
   */
  private async generateStoryScid(profileId: string): Promise<string> {
    const artistHash = profileId.slice(-4).toUpperCase(); // Last 4 chars of profile ID
    const year = new Date().getFullYear().toString().slice(-2); // Last 2 digits of year

    // Find the highest sequence for this artist's permanent stories
    const latestStory = await StoryModel.findOne({
      profileId: new mongoose.Types.ObjectId(profileId),
      isPermanent: true,
      scid: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 }).lean();

    let sequence = 1;
    if (latestStory?.scid) {
      // Extract sequence from existing SCid (last 6 digits)
      const existingSeq = parseInt(latestStory.scid.split('-').pop() || '0', 10);
      sequence = existingSeq + 1;
    }

    // Format: SR-POL-XXXX-YYNNNNNN (SR=Story Reel, POL=Polygon, XXXX=artistHash, YY=year, NNNNNN=sequence)
    const sequenceStr = `${year}${sequence.toString().padStart(6, '0')}`;
    return `SR-POL-${artistHash}-${sequenceStr}`;
  }

  /**
   * Make a story permanent (removes expiry, generates SCid for rewards)
   */
  async makePermanent(params: MakePermanentParams): Promise<Story> {
    const { storyId, txHash, paymentToken, amountPaid } = params;

    // Get the story first to get profileId for SCid generation
    const existingStory = await StoryModel.findById(storyId).lean();
    if (!existingStory) {
      throw new UserInputError('Story not found');
    }

    // Generate SCid for this permanent story
    const scid = await this.generateStoryScid(existingStory.profileId.toString());

    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      {
        isPermanent: true,
        permanentTxHash: txHash,
        scid,
        paymentToken,
        amountPaid,
        $unset: { expiresAt: 1 }, // Remove expiry
      },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    // Log activity for making story permanent
    try {
      await this.context.activityService.logActivity({
        type: 'MINTED',
        profileId: existingStory.profileId.toString(),
        targetId: storyId,
        message: `made a reel permanent (SCid: ${scid})`,
      });
    } catch (err) {
      console.error('[StoryService] Failed to log permanent activity:', err);
    }

    return story as unknown as Story;
  }

  /**
   * Delete expired non-permanent stories (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const now = new Date();

    const result = await StoryModel.updateMany(
      {
        expiresAt: { $lt: now },
        isPermanent: false,
        deleted: false,
      },
      {
        deleted: true,
      }
    );

    return result.modifiedCount;
  }

  /**
   * Soft delete a story
   */
  async deleteStory(storyId: string, profileId: string): Promise<Story> {
    const story = await StoryModel.findOneAndUpdate(
      {
        _id: storyId,
        profileId: new mongoose.Types.ObjectId(profileId),
      },
      { deleted: true },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError("Story not found or you don't have permission to delete it");
    }

    return story as unknown as Story;
  }

  /**
   * Create a guest story (no account required, wallet-only)
   * Guest stories still expire in 24 hours and can be uploaded to IPFS
   */
  async createGuestStory(params: CreateGuestStoryParams): Promise<Story> {
    const { walletAddress, mediaUrl, mediaType, caption, duration } = params;

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);

    const story = new StoryModel({
      // Guest stories don't have a profileId - use wallet address for identification
      walletAddress: walletAddress.toLowerCase(),
      isGuest: true,
      mediaUrl,
      mediaType,
      caption,
      duration: duration || (mediaType === 'video' ? undefined : 60),
      expiresAt,
      isPermanent: false,
      viewCount: 0,
      reactions: [],
      viewerIds: [],
      deleted: false,
    });

    await story.save();

    return story.toObject() as unknown as Story;
  }

  /**
   * Delete a guest story (by wallet address)
   */
  async deleteGuestStory(storyId: string, walletAddress: string): Promise<Story> {
    const story = await StoryModel.findOneAndUpdate(
      {
        _id: storyId,
        walletAddress: walletAddress.toLowerCase(),
        isGuest: true,
      },
      { deleted: true },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError("Story not found or you don't have permission to delete it");
    }

    return story as unknown as Story;
  }
}
