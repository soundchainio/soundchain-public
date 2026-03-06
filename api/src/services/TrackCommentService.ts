import mongoose from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';
import { UserInputError, ForbiddenError } from 'apollo-server-express';
import { FilterQuery } from 'mongoose';
import { PaginateResult } from '../db/pagination/paginate';
import { TrackComment, TrackCommentModel } from '../models/TrackComment';
import { TrackModel } from '../models/Track';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { SortOrder } from '../types/SortOrder';
import { ModelService } from './ModelService';

interface TrackCommentKeyComponents {
  trackId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  timestamp: number;
}

export class TrackCommentService extends ModelService<typeof TrackComment, TrackCommentKeyComponents> {
  constructor(context: Context) {
    super(context, TrackCommentModel);
  }

  keyIteratee = ({ trackId, profileId, timestamp }: Partial<DocumentType<TrackComment>>): string => {
    return `${trackId?.toString()}:${profileId?.toString()}:${timestamp}`;
  };

  getFindConditionForKeys(keys: readonly string[]): FilterQuery<TrackComment> {
    return {
      $or: keys.map(key => {
        const [trackId, profileId, timestamp] = key.split(':');
        return {
          trackId: new mongoose.Types.ObjectId(trackId),
          profileId: new mongoose.Types.ObjectId(profileId),
          timestamp: parseFloat(timestamp),
        };
      }),
    };
  }

  /**
   * Create a new timestamped comment on a track
   */
  async createComment(params: {
    trackId: string;
    profileId: mongoose.Types.ObjectId;
    text: string;
    timestamp: number;
    replyToId?: string;
    embedUrl?: string;
  }): Promise<TrackComment> {
    // Count actual content length: each sticker counts as 1 char, text counts normally
    const stickerPattern = /!\[emote:[^\]]+\]\([^)]+\)/g;
    const stickers = params.text.match(stickerPattern) || [];
    const textWithoutStickers = params.text.replace(stickerPattern, '').trim();
    const contentLength = textWithoutStickers.length + stickers.length;

    if (contentLength > 280) {
      throw new UserInputError('Comment must be 280 characters or less (stickers count as 1 each)');
    }

    if (params.timestamp < 0) {
      throw new UserInputError('Timestamp must be positive');
    }

    // Validate embed URL if provided
    if (params.embedUrl) {
      try {
        new URL(params.embedUrl);
      } catch {
        throw new UserInputError('Invalid embed URL');
      }
    }

    const comment = new this.model({
      trackId: new mongoose.Types.ObjectId(params.trackId),
      profileId: params.profileId,
      text: params.text.trim(),
      timestamp: params.timestamp,
      replyToId: params.replyToId ? new mongoose.Types.ObjectId(params.replyToId) : undefined,
      embedUrl: params.embedUrl?.trim(),
      likeCount: 0,
      isPinned: false,
      deleted: false,
    });

    await comment.save();
    // Convert to plain object to avoid mongoose Symbol(mongoose#Document#scope) serialization errors
    return comment.toObject() as TrackComment;
  }

  /**
   * Get all comments for a track, sorted by timestamp
   */
  async getTrackComments(trackId: string, page?: PageInput): Promise<PaginateResult<TrackComment>> {
    return this.paginate({
      filter: {
        trackId: new mongoose.Types.ObjectId(trackId),
        deleted: false,
      },
      page,
      sort: { field: 'timestamp', order: SortOrder.ASC },
    });
  }

  /**
   * Get comments at a specific timestamp range (for hover display)
   */
  async getCommentsAtTimestamp(
    trackId: string,
    timestamp: number,
    range: number = 2 // seconds before/after
  ): Promise<TrackComment[]> {
    return this.model.find({
      trackId: new mongoose.Types.ObjectId(trackId),
      deleted: false,
      timestamp: {
        $gte: timestamp - range,
        $lte: timestamp + range,
      },
    }).sort({ timestamp: 1 }).limit(10).lean();
  }

  /**
   * Get comment count for a track
   */
  async getCommentCount(trackId: string): Promise<number> {
    return this.model.countDocuments({
      trackId: new mongoose.Types.ObjectId(trackId),
      deleted: false,
    });
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, profileId: mongoose.Types.ObjectId): Promise<TrackComment> {
    const comment = await this.model.findById(commentId);

    if (!comment) {
      throw new UserInputError('Comment not found');
    }

    // Only the author can delete their comment
    if (comment.profileId.toString() !== profileId.toString()) {
      throw new UserInputError('You can only delete your own comments');
    }

    comment.deleted = true;
    await comment.save();
    // Convert to plain object to avoid mongoose serialization errors
    return comment.toObject() as TrackComment;
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string): Promise<TrackComment> {
    const comment = await this.model.findByIdAndUpdate(
      commentId,
      { $inc: { likeCount: 1 } },
      { new: true }
    ).lean();

    if (!comment) {
      throw new UserInputError('Comment not found');
    }

    return comment as unknown as TrackComment;
  }

  /**
   * Pin/unpin a comment (track owner only)
   */
  async togglePinComment(commentId: string, requestingProfileId: mongoose.Types.ObjectId): Promise<TrackComment> {
    const comment = await this.model.findById(commentId);

    if (!comment) {
      throw new UserInputError('Comment not found');
    }

    // Verify the requesting user owns the track
    const track = await TrackModel.findById(comment.trackId);
    if (!track) {
      throw new UserInputError('Track not found');
    }

    // Check if the requesting user is the track owner
    if (track.profileId.toString() !== requestingProfileId.toString()) {
      throw new ForbiddenError('Only the track owner can pin/unpin comments');
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();
    // Convert to plain object to avoid mongoose serialization errors
    return comment.toObject() as TrackComment;
  }

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string): Promise<TrackComment | null> {
    return this.model.findOne({
      _id: new mongoose.Types.ObjectId(commentId),
      deleted: false,
    });
  }

  /**
   * Get comments by a specific user on a track
   */
  async getUserCommentsOnTrack(
    trackId: string,
    profileId: mongoose.Types.ObjectId
  ): Promise<TrackComment[]> {
    return this.model.find({
      trackId: new mongoose.Types.ObjectId(trackId),
      profileId,
      deleted: false,
    }).sort({ timestamp: 1 });
  }
}
