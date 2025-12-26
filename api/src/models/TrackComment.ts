/**
 * TrackComment Model
 *
 * SoundCloud-style timestamped comments on tracks.
 * Comments are pinned to specific timestamps on the waveform.
 */

import { getModelForClass, modelOptions, prop, Severity, index } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, Float } from 'type-graphql';
import { Model } from './Model';

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    timestamps: true,
    collection: 'trackcomments',
  },
})
@ObjectType()
@index({ trackId: 1, timestamp: 1 })
@index({ profileId: 1 })
@index({ createdAt: -1 })
export class TrackComment extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  /**
   * Reference to the Track this comment belongs to
   */
  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  trackId: mongoose.Types.ObjectId;

  /**
   * Reference to the Profile (user) who posted the comment
   */
  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  /**
   * The comment text (supports sticker markdown which can be long)
   * Content limit is 280 chars (text + stickers count as 1 each) - enforced in service
   */
  @Field(() => String)
  @prop({ required: true, maxlength: 5000 })
  text: string;

  /**
   * Optional embed URL (YouTube, Spotify, SoundCloud, etc.)
   */
  @Field(() => String, { nullable: true })
  @prop({ maxlength: 2000 })
  embedUrl?: string;

  /**
   * Timestamp in seconds where the comment is placed on the waveform
   */
  @Field(() => Float)
  @prop({ required: true, min: 0 })
  timestamp: number;

  /**
   * Optional: Reply to another track comment
   */
  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId })
  replyToId?: mongoose.Types.ObjectId;

  /**
   * Like count for this comment
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  likeCount: number;

  /**
   * Whether this comment is pinned by the track owner
   */
  @Field(() => Boolean)
  @prop({ required: true, default: false })
  isPinned: boolean;

  /**
   * Soft delete flag
   */
  @Field(() => Boolean)
  @prop({ required: true, default: false })
  deleted: boolean;

  /**
   * Timestamps
   */
  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackCommentModel = getModelForClass(TrackComment);

export default TrackComment;
