import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import { ActivityType } from '../types/ActivityType';
import { Model } from './Model';

/**
 * Metadata interfaces for different activity types
 */
export interface ListenedMetadata {
  trackId: string;
  trackTitle: string;
  artistName?: string;
  artworkUrl?: string;
}

export interface LikedMetadata {
  postId: string;
  postBody?: string;
}

export interface CommentedMetadata {
  postId: string;
  commentBody?: string;
}

export interface FollowedMetadata {
  followedProfileId: string;
  followedDisplayName: string;
  followedHandle?: string;
}

export interface MintedMetadata {
  trackId: string;
  trackTitle: string;
  editionId?: string;
  quantity?: number;
}

export interface PostedMetadata {
  postId: string;
  postBody?: string;
  hasMedia?: boolean;
}

export type ActivityMetadata =
  | ListenedMetadata
  | LikedMetadata
  | CommentedMetadata
  | FollowedMetadata
  | MintedMetadata
  | PostedMetadata;

@ObjectType()
@index({ profileId: 1, createdAt: -1 })
@index({ createdAt: -1 })
@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW }
})
export class Activity extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  public profileId!: string;

  @Field(() => ActivityType)
  @prop({ required: true, enum: ActivityType, type: String })
  public type!: ActivityType;

  @Field(() => GraphQLJSON, { nullable: true })
  @prop({ required: false, type: mongoose.Schema.Types.Mixed })
  public metadata?: ActivityMetadata;

  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => Date)
  public updatedAt!: Date;
}

export const ActivityModel = getModelForClass(Activity);
