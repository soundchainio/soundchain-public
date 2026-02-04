import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, Float } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class StoryReaction {
  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  emoji!: string;

  @Field(() => Date)
  @prop({ default: () => new Date() })
  createdAt!: Date;
}

// Overlay types for Reels 2.0
@ObjectType()
export class StoryOverlay {
  @Field(() => String)
  @prop({ required: true })
  type!: 'text' | 'hashtag' | 'mention' | 'sticker' | 'nft_badge';

  @Field(() => String)
  @prop({ required: true })
  content!: string;

  @Field(() => Float)
  @prop({ required: true })
  positionX!: number; // 0-100 percentage

  @Field(() => Float)
  @prop({ required: true })
  positionY!: number; // 0-100 percentage

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  fontFamily?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  color?: string;

  @Field(() => Float, { nullable: true })
  @prop({ required: false })
  fontSize?: number;

  @Field(() => Float, { nullable: true })
  @prop({ required: false })
  rotation?: number; // degrees

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  mentionedUserId?: mongoose.Types.ObjectId; // For @mentions
}

// Viewer watch record for SCID rewards
@ObjectType()
export class StoryWatchRecord {
  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  viewerProfileId?: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  viewerWalletAddress?: string;

  @Field(() => Float)
  @prop({ required: true })
  watchDurationSeconds!: number;

  @Field(() => Boolean)
  @prop({ default: false })
  qualifiedForReward!: boolean; // 30+ seconds watched

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  viewerScid?: string; // SCID code for viewer rewards

  @Field(() => Date)
  @prop({ default: () => new Date() })
  watchedAt!: Date;
}

@ObjectType()
export class Story extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false, index: true })
  profileId?: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  @prop({ required: false, index: true })
  walletAddress?: string; // For guest stories (no account required)

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isGuest?: boolean; // True for guest-created stories

  @Field(() => String)
  @prop({ required: true })
  mediaUrl!: string;

  @Field(() => String)
  @prop({ required: true })
  mediaType!: string; // 'image' | 'video'

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  caption?: string;

  @Field(() => Number)
  @prop({ default: 60 }) // Default 60 seconds for images
  duration!: number;

  @Field(() => Date)
  @prop({ required: true, index: true })
  expiresAt!: Date;

  @Field(() => Boolean)
  @prop({ default: false })
  isPermanent!: boolean;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  permanentTxHash?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false, index: true })
  scid?: string; // SCid for permanent stories - enables streaming rewards

  @Field(() => Number, { nullable: true })
  @prop({ required: false })
  amountPaid?: number; // OGUN or POL paid to make permanent

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  paymentToken?: string; // 'OGUN' or 'POL'

  @Field(() => Number)
  @prop({ default: 0 })
  viewCount!: number;

  @Field(() => [StoryReaction])
  @prop({ type: () => [StoryReaction], default: [] })
  reactions!: StoryReaction[];

  @Field(() => [ID], { nullable: true })
  @prop({ type: () => [mongoose.Types.ObjectId], default: [] })
  viewerIds?: mongoose.Types.ObjectId[];

  @Field(() => Boolean)
  @prop({ default: false })
  deleted!: boolean;

  // ============================================
  // REELS 2.0: Overlays, NFT Music, SCID Rewards
  // ============================================

  // Overlays (text, hashtags, mentions, stickers)
  @Field(() => [StoryOverlay], { nullable: true })
  @prop({ type: () => [StoryOverlay], default: [] })
  overlays?: StoryOverlay[];

  // Attached NFT track for music
  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false, index: true })
  attachedTrackId?: mongoose.Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @prop({ type: mongoose.Types.ObjectId, required: false })
  attachedTrackEditionId?: mongoose.Types.ObjectId;

  // Track IPFS URL (denormalized for fast access)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  attachedTrackIpfsUrl?: string;

  // Track artist info (denormalized)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  attachedTrackTitle?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  attachedTrackArtist?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  attachedTrackCoverUrl?: string;

  // SCID streaming rewards tracking
  @Field(() => Boolean)
  @prop({ default: false })
  scidEligible!: boolean; // True when permanent + has attached track

  @Field(() => Number)
  @prop({ default: 0 })
  totalQualifiedViews!: number; // Views that watched 30+ seconds

  @Field(() => [StoryWatchRecord], { nullable: true })
  @prop({ type: () => [StoryWatchRecord], default: [] })
  watchRecords?: StoryWatchRecord[];

  // Hashtags extracted from overlays (for search/discovery)
  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String], default: [] })
  hashtags?: string[];

  // Mentioned users extracted from overlays (for notifications)
  @Field(() => [ID], { nullable: true })
  @prop({ type: () => [mongoose.Types.ObjectId], default: [] })
  mentionedUserIds?: mongoose.Types.ObjectId[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const StoryModel = getModelForClass(Story);
