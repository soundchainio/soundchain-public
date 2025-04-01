import { prop, modelOptions, getModelForClass, defaultClasses, index, Severity } from '@typegoose/typegoose';
import { Field, ObjectType, ID } from 'type-graphql';
import GraphQLJSON from 'graphql-type-json';
import mongoose from 'mongoose';
import {
  NotificationType,
  CommentNotificationMetadata,
  DeletedCommentNotificationMetadata,
  DeletedPostNotificationMetadata,
  FollowerNotificationMetadata,
  NewPostNotificationMetadata,
  NewVerificationRequestNotificationMetadata,
  NFTSoldNotificationMetadata,
  ReactionNotificationMetadata,
  TrackWithPriceMetadata,
  VerificationRequestNotificationMetadata
} from '../types';
import { Model } from './Model';

@ObjectType()
@index({ profileId: 1 })
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { timestamps: true },
})
export class Notification extends Model {
  // Override the base class _id to ensure it's an ObjectId
  @Field(() => ID)
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => NotificationType)
  @prop({ required: true, enum: NotificationType })
  public type!: NotificationType;

  @Field(() => String)
  @prop({ required: true })
  public profileId!: string;

  // Use your existing union of metadata types
  @Field(() => GraphQLJSON, { nullable: true })
  @prop({ required: false, type: mongoose.Schema.Types.Mixed })
  public metadata?:
    | CommentNotificationMetadata
    | DeletedCommentNotificationMetadata
    | DeletedPostNotificationMetadata
    | FollowerNotificationMetadata
    | NewPostNotificationMetadata
    | NewVerificationRequestNotificationMetadata
    | NFTSoldNotificationMetadata
    | ReactionNotificationMetadata
    | VerificationRequestNotificationMetadata
    | TrackWithPriceMetadata;

  @Field(() => Date)
  public createdAt!: Date;

  @Field(() => Date)
  public updatedAt!: Date;
}

export const NotificationModel = getModelForClass(Notification);
