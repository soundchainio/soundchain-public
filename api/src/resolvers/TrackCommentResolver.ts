import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Float, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { TrackComment } from '../models/TrackComment';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { TrackCommentConnection } from '../types/TrackCommentConnection';

@Resolver(TrackComment)
export class TrackCommentResolver {
  /**
   * Resolve the profile (author) of the comment
   */
  @FieldResolver(() => Profile, { nullable: true })
  async profile(@Ctx() { profileService }: Context, @Root() comment: TrackComment): Promise<Profile | null> {
    // Defensive null check to prevent mongoose scope errors
    if (!comment || !comment.profileId) {
      return null;
    }
    try {
      return profileService.getProfile(comment.profileId.toString());
    } catch (err) {
      console.error('[TrackCommentResolver] Error fetching profile:', err);
      return null;
    }
  }

  /**
   * Resolve reply-to comment if exists
   */
  @FieldResolver(() => TrackComment, { nullable: true })
  async replyTo(
    @Ctx() { trackCommentService }: Context,
    @Root() comment: TrackComment
  ): Promise<TrackComment | null> {
    if (!comment.replyToId) return null;
    return trackCommentService.getComment(comment.replyToId.toString());
  }

  /**
   * Get all comments for a track (sorted by timestamp)
   */
  @Query(() => TrackCommentConnection)
  async trackComments(
    @Ctx() { trackCommentService }: Context,
    @Arg('trackId') trackId: string,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackCommentConnection> {
    return trackCommentService.getTrackComments(trackId, page);
  }

  /**
   * Get comments near a specific timestamp (for waveform hover)
   */
  @Query(() => [TrackComment])
  async commentsAtTimestamp(
    @Ctx() { trackCommentService }: Context,
    @Arg('trackId') trackId: string,
    @Arg('timestamp', () => Float) timestamp: number,
    @Arg('range', () => Float, { nullable: true }) range?: number,
  ): Promise<TrackComment[]> {
    return trackCommentService.getCommentsAtTimestamp(trackId, timestamp, range);
  }

  /**
   * Get comment count for a track
   */
  @Query(() => Number)
  async trackCommentCount(
    @Ctx() { trackCommentService }: Context,
    @Arg('trackId') trackId: string,
  ): Promise<number> {
    return trackCommentService.getCommentCount(trackId);
  }

  /**
   * Create a new timestamped comment
   */
  @Mutation(() => TrackComment)
  @Authorized()
  async createTrackComment(
    @Ctx() { trackCommentService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('trackId') trackId: string,
    @Arg('text') text: string,
    @Arg('timestamp', () => Float) timestamp: number,
    @Arg('replyToId', { nullable: true }) replyToId?: string,
    @Arg('embedUrl', { nullable: true }) embedUrl?: string,
  ): Promise<TrackComment> {
    return trackCommentService.createComment({
      trackId,
      profileId,
      text,
      timestamp,
      replyToId,
      embedUrl,
    });
  }

  /**
   * Delete a comment (soft delete)
   */
  @Mutation(() => TrackComment)
  @Authorized()
  async deleteTrackComment(
    @Ctx() { trackCommentService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('commentId') commentId: string,
  ): Promise<TrackComment> {
    return trackCommentService.deleteComment(commentId, profileId);
  }

  /**
   * Like a comment
   */
  @Mutation(() => TrackComment)
  @Authorized()
  async likeTrackComment(
    @Ctx() { trackCommentService }: Context,
    @Arg('commentId') commentId: string,
  ): Promise<TrackComment> {
    return trackCommentService.likeComment(commentId);
  }

  /**
   * Get a single comment
   */
  @Query(() => TrackComment, { nullable: true })
  async trackComment(
    @Ctx() { trackCommentService }: Context,
    @Arg('commentId') commentId: string,
  ): Promise<TrackComment | null> {
    return trackCommentService.getComment(commentId);
  }
}
