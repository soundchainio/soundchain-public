import mongoose from 'mongoose';
import { UserInputError } from 'apollo-server-express';
import { Story, StoryModel, StoryOverlay, StoryWatchRecord } from '../models/Story';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';

// Overlay input type
interface OverlayInput {
  type: 'text' | 'hashtag' | 'mention' | 'sticker' | 'nft_badge';
  content: string;
  positionX: number;
  positionY: number;
  fontFamily?: string;
  color?: string;
  fontSize?: number;
  rotation?: number;
  mentionedUserId?: string;
}

interface CreateStoryParams {
  profileId: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  duration?: number;
  overlays?: OverlayInput[];
  attachedTrackId?: string;
  // Raw audio attachment (for wall post audio shares — no Track document needed)
  attachedAudioUrl?: string;
  attachedAudioTitle?: string;
  attachedAudioArtist?: string;
  attachedAudioCoverUrl?: string;
}

interface CreateGuestStoryParams {
  walletAddress: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  duration?: number;
  overlays?: OverlayInput[];
  attachedTrackId?: string;
}

interface AttachTrackParams {
  storyId: string;
  trackId: string;
  trackEditionId?: string;
}

interface RecordWatchParams {
  storyId: string;
  viewerProfileId?: string;
  viewerWalletAddress?: string;
  watchDurationSeconds: number;
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
   * Supports overlays and attached NFT tracks for Reels 2.0
   */
  async create(params: CreateStoryParams): Promise<Story> {
    const { profileId, mediaUrl, mediaType, caption, duration, overlays, attachedTrackId, attachedAudioUrl, attachedAudioTitle, attachedAudioArtist, attachedAudioCoverUrl } = params;

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);

    // Process overlays to extract hashtags and mentions
    const { processedOverlays, hashtags, mentionedUserIds } = this.processOverlays(overlays || []);

    // Fetch creator profile info (helix pattern - snapshot at creation)
    let creatorDetails: any = {};
    console.log('[StoryService] Creating story for profileId:', profileId);
    try {
      const profile = await this.context.profileService.getProfile(profileId);
      console.log('[StoryService] Profile fetched:', profile ? {
        id: profile._id,
        displayName: profile.displayName,
        profilePicture: profile.profilePicture?.substring(0, 50)
      } : 'null');

      if (profile) {
        // Also fetch user to get the handle (userHandle is on User, not Profile)
        const user = await this.context.userService.getUserByProfileId(profileId);
        console.log('[StoryService] User fetched:', user ? { id: user._id, handle: user.handle } : 'null');

        creatorDetails = {
          creatorDisplayName: profile.displayName,
          creatorUserHandle: user?.handle || profile.displayName,
          creatorAvatarUrl: profile.profilePicture,
        };
        console.log('[StoryService] Creator details to save:', creatorDetails);
      } else {
        console.warn('[StoryService] No profile found for profileId:', profileId);
      }
    } catch (err) {
      console.error('[StoryService] Failed to fetch creator profile:', err);
    }

    // If track is attached, fetch track details
    let trackDetails: any = {};
    if (attachedTrackId) {
      try {
        const track = await this.context.trackService.getTrack(attachedTrackId);
        if (track) {
          trackDetails = {
            attachedTrackId: new mongoose.Types.ObjectId(attachedTrackId),
            attachedTrackIpfsUrl: track.ipfsCid ? `ipfs://${track.ipfsCid}` : track.assetUrl,
            attachedTrackTitle: track.title,
            attachedTrackArtist: track.artist,
            attachedTrackCoverUrl: track.artworkUrl,
          };
        }
      } catch (err) {
        console.error('[StoryService] Failed to fetch attached track:', err);
      }
    } else if (attachedAudioUrl) {
      // Raw audio attachment (wall post audio shares — no Track document)
      trackDetails = {
        attachedTrackIpfsUrl: attachedAudioUrl,
        attachedTrackTitle: attachedAudioTitle || 'Wall Post Audio',
        attachedTrackArtist: attachedAudioArtist || '',
        attachedTrackCoverUrl: attachedAudioCoverUrl || '',
      };
    }

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
      // Creator info (helix snapshot)
      ...creatorDetails,
      // Reels 2.0 fields
      overlays: processedOverlays,
      hashtags,
      mentionedUserIds,
      ...trackDetails,
      scidEligible: false,
      totalQualifiedViews: 0,
      watchRecords: [],
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

    // Send notification to story owner (if not guest story and viewer is different from owner)
    if (viewerProfileId && story.profileId && story.profileId.toString() !== viewerProfileId) {
      try {
        await this.context.notificationService.notifyStoryView({
          storyOwnerId: story.profileId.toString(),
          viewerProfileId,
          storyId,
        });
      } catch (err) {
        console.error('[StoryService] Failed to send story view notification:', err);
      }
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

    // Send notification to story owner (if not guest story and reactor is different from owner)
    if (story.profileId && story.profileId.toString() !== profileId) {
      try {
        await this.context.notificationService.notifyStoryReaction({
          storyOwnerId: story.profileId.toString(),
          reactorProfileId: profileId,
          emoji,
          storyId,
        });
      } catch (err) {
        console.error('[StoryService] Failed to send story reaction notification:', err);
      }
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

    // Log activity for making story permanent (using Minted metadata format)
    try {
      await this.context.activityService.logMinted(
        existingStory.profileId.toString(),
        scid,
        existingStory.caption || 'Permanent Reel'
      );
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
   * Supports overlays and attached tracks for Reels 2.0
   */
  async createGuestStory(params: CreateGuestStoryParams): Promise<Story> {
    const { walletAddress, mediaUrl, mediaType, caption, duration, overlays, attachedTrackId } = params;

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);

    // Process overlays to extract hashtags and mentions
    const { processedOverlays, hashtags, mentionedUserIds } = this.processOverlays(overlays || []);

    // If track is attached, fetch track details
    let trackDetails: any = {};
    if (attachedTrackId) {
      try {
        const track = await this.context.trackService.getTrack(attachedTrackId);
        if (track) {
          trackDetails = {
            attachedTrackId: new mongoose.Types.ObjectId(attachedTrackId),
            attachedTrackIpfsUrl: track.ipfsCid ? `ipfs://${track.ipfsCid}` : track.assetUrl,
            attachedTrackTitle: track.title,
            attachedTrackArtist: track.artist,
            attachedTrackCoverUrl: track.artworkUrl,
          };
        }
      } catch (err) {
        console.error('[StoryService] Failed to fetch attached track for guest story:', err);
      }
    }

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
      // Reels 2.0 fields
      overlays: processedOverlays,
      hashtags,
      mentionedUserIds,
      ...trackDetails,
      scidEligible: false,
      totalQualifiedViews: 0,
      watchRecords: [],
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

  // ============================================
  // REELS 2.0: Overlays, NFT Music, SCID Rewards
  // ============================================

  /**
   * Process overlays to extract hashtags and mentioned users
   */
  private processOverlays(overlays: OverlayInput[]): {
    processedOverlays: StoryOverlay[];
    hashtags: string[];
    mentionedUserIds: mongoose.Types.ObjectId[];
  } {
    const hashtags: string[] = [];
    const mentionedUserIds: mongoose.Types.ObjectId[] = [];
    const processedOverlays: StoryOverlay[] = [];

    for (const overlay of overlays) {
      const processed: any = {
        type: overlay.type,
        content: overlay.content,
        positionX: overlay.positionX,
        positionY: overlay.positionY,
        fontFamily: overlay.fontFamily,
        color: overlay.color,
        fontSize: overlay.fontSize,
        rotation: overlay.rotation,
      };

      // Extract hashtags
      if (overlay.type === 'hashtag') {
        const tag = overlay.content.startsWith('#') ? overlay.content.slice(1) : overlay.content;
        if (tag && !hashtags.includes(tag.toLowerCase())) {
          hashtags.push(tag.toLowerCase());
        }
      }

      // Extract mentions
      if (overlay.type === 'mention' && overlay.mentionedUserId) {
        processed.mentionedUserId = new mongoose.Types.ObjectId(overlay.mentionedUserId);
        if (!mentionedUserIds.find(id => id.toString() === overlay.mentionedUserId)) {
          mentionedUserIds.push(new mongoose.Types.ObjectId(overlay.mentionedUserId));
        }
      }

      // Also extract hashtags from text overlays
      if (overlay.type === 'text') {
        const hashtagMatches = overlay.content.match(/#(\w+)/g);
        if (hashtagMatches) {
          for (const match of hashtagMatches) {
            const tag = match.slice(1).toLowerCase();
            if (!hashtags.includes(tag)) {
              hashtags.push(tag);
            }
          }
        }
      }

      processedOverlays.push(processed as StoryOverlay);
    }

    return { processedOverlays, hashtags, mentionedUserIds };
  }

  /**
   * Attach an NFT track to a story
   */
  async attachTrack(params: AttachTrackParams): Promise<Story> {
    const { storyId, trackId, trackEditionId } = params;

    // Fetch track details
    const track = await this.context.trackService.getTrack(trackId);
    if (!track) {
      throw new UserInputError('Track not found');
    }

    const updateData: any = {
      attachedTrackId: new mongoose.Types.ObjectId(trackId),
      attachedTrackIpfsUrl: track.ipfsCid ? `ipfs://${track.ipfsCid}` : track.assetUrl,
      attachedTrackTitle: track.title,
      attachedTrackArtist: track.artist,
      attachedTrackCoverUrl: track.artworkUrl,
    };

    if (trackEditionId) {
      updateData.attachedTrackEditionId = new mongoose.Types.ObjectId(trackEditionId);
    }

    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    return story as unknown as Story;
  }

  /**
   * Update story overlays
   */
  async updateOverlays(storyId: string, overlays: OverlayInput[], profileId: string): Promise<Story> {
    // Verify ownership
    const existingStory = await StoryModel.findById(storyId).lean();
    if (!existingStory || existingStory.profileId?.toString() !== profileId) {
      throw new UserInputError("Story not found or you don't have permission to edit it");
    }

    const { processedOverlays, hashtags, mentionedUserIds } = this.processOverlays(overlays);

    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      {
        $set: {
          overlays: processedOverlays,
          hashtags,
          mentionedUserIds,
        },
      },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    // Send notifications to mentioned users
    for (const mentionedId of mentionedUserIds) {
      try {
        await this.context.notificationService.notifyMention({
          mentionedProfileId: mentionedId.toString(),
          mentionerProfileId: profileId,
          storyId,
          type: 'story',
        });
      } catch (err) {
        console.error('[StoryService] Failed to send mention notification:', err);
      }
    }

    return story as unknown as Story;
  }

  /**
   * Record a watch session for SCID rewards
   * Viewers who watch 30+ seconds qualify for rewards
   */
  async recordWatch(params: RecordWatchParams): Promise<{ qualified: boolean; viewerScid?: string }> {
    const { storyId, viewerProfileId, viewerWalletAddress, watchDurationSeconds } = params;
    const MINIMUM_WATCH_SECONDS = 30;

    const story = await StoryModel.findById(storyId).lean();
    if (!story) {
      throw new UserInputError('Story not found');
    }

    // Only generate SCID if story is permanent and SCID-eligible
    const qualified = watchDurationSeconds >= MINIMUM_WATCH_SECONDS && story.scidEligible && story.isPermanent;
    let viewerScid: string | undefined;

    if (qualified) {
      // Generate viewer SCID
      viewerScid = await this.generateViewerScid(storyId, viewerProfileId || viewerWalletAddress || 'anon');
    }

    const watchRecord: any = {
      watchDurationSeconds,
      qualifiedForReward: qualified,
      viewerScid,
      watchedAt: new Date(),
    };

    if (viewerProfileId) {
      watchRecord.viewerProfileId = new mongoose.Types.ObjectId(viewerProfileId);
    }
    if (viewerWalletAddress) {
      watchRecord.viewerWalletAddress = viewerWalletAddress.toLowerCase();
    }

    const updateOps: any = {
      $push: { watchRecords: watchRecord },
    };

    if (qualified) {
      updateOps.$inc = { totalQualifiedViews: 1 };
    }

    await StoryModel.findByIdAndUpdate(storyId, updateOps);

    return { qualified, viewerScid };
  }

  /**
   * Generate a viewer SCID for reel watching rewards
   * Format: SRV-POL-XXXX-XXXXXX (Story Reel Viewer)
   */
  private async generateViewerScid(storyId: string, viewerId: string): Promise<string> {
    const storyHash = storyId.slice(-4).toUpperCase();
    const viewerHash = viewerId.slice(-4).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `SRV-POL-${storyHash}-${viewerHash}${timestamp}`;
  }

  /**
   * Search stories by hashtag
   */
  async searchByHashtag(hashtag: string, limit: number = 20): Promise<Story[]> {
    const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    const now = new Date();

    const stories = await StoryModel.find({
      hashtags: tag.toLowerCase(),
      deleted: false,
      $or: [
        { expiresAt: { $gt: now } },
        { isPermanent: true },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Get stories that use a specific track (for artist dashboard)
   */
  async getStoriesWithTrack(trackId: string, limit: number = 50): Promise<Story[]> {
    const now = new Date();

    const stories = await StoryModel.find({
      attachedTrackId: new mongoose.Types.ObjectId(trackId),
      deleted: false,
      $or: [
        { expiresAt: { $gt: now } },
        { isPermanent: true },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Get trending stories (by view count and qualified views)
   */
  async getTrending(limit: number = 20): Promise<Story[]> {
    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await StoryModel.find({
      deleted: false,
      createdAt: { $gte: oneDayAgo },
      $or: [
        { expiresAt: { $gt: now } },
        { isPermanent: true },
      ],
    })
      .sort({ viewCount: -1, totalQualifiedViews: -1 })
      .limit(limit)
      .lean();

    return stories as unknown as Story[];
  }

  /**
   * Get stories that need backfill (have profileId but missing creator details)
   */
  async getStoriesNeedingBackfill(): Promise<Story[]> {
    const stories = await StoryModel.find({
      profileId: { $exists: true, $ne: null },
      $or: [
        { creatorDisplayName: { $exists: false } },
        { creatorDisplayName: null },
        { creatorDisplayName: '' },
      ],
      deleted: false,
    }).lean();

    return stories as unknown as Story[];
  }

  /**
   * Update creator details for a story (helix pattern backfill)
   */
  async updateCreatorDetails(
    storyId: string,
    details: {
      creatorDisplayName?: string;
      creatorUserHandle?: string;
      creatorAvatarUrl?: string;
    }
  ): Promise<Story> {
    const story = await StoryModel.findByIdAndUpdate(
      storyId,
      { $set: details },
      { new: true }
    ).lean();

    if (!story) {
      throw new UserInputError('Story not found');
    }

    return story as unknown as Story;
  }
}
