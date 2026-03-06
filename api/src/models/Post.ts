import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ReactionStats } from '../types/ReactionStats';
import { Model } from './Model';

@ObjectType()
export class Post extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  profileId?: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  body?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  mediaLink?: string;

  // Original URL before conversion to embed format (for oEmbed lookups)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  originalMediaLink?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  mediaThumbnail?: string;

  // Guest post fields (wallet-only, no account required)
  @Field(() => String, { nullable: true })
  @prop({ type: String, required: false, lowercase: true })
  walletAddress?: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ type: Boolean, default: false })
  isGuest?: boolean;

  @prop({ required: true, default: {}, _id: false })
  reactionStats: ReactionStats;

  @Field(() => ID, { nullable: true }) // Add @Field() decorator
  @prop({ required: false, type: mongoose.Types.ObjectId })
  repostId?: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  trackId?: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: mongoose.Types.ObjectId })
  trackEditionId?: mongoose.Types.ObjectId;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  // Ephemeral media upload fields (24h Snapchat-style stories)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  uploadedMediaUrl?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  uploadedMediaType?: string; // 'image' | 'video' | 'audio'

  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  mediaExpiresAt?: Date;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isEphemeral?: boolean;

  // Make Post Permanent feature fields
  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isPermanent?: boolean;

  @Field(() => Number, { nullable: true })
  @prop({ required: false })
  permanentPrice?: number;

  @Field(() => Number, { nullable: true })
  @prop({ required: false })
  mediaSize?: number;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  permanentTxHash?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const PostModel = getModelForClass(Post);
