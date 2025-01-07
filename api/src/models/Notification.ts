import { Field } from 'type-graphql';
import { modelOptions, Severity, prop, getModelForClass } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Model } from './Model';
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
  VerificationRequestNotificationMetadata,
  TrackWithPriceMetadata,
} from './types/NotificationTypes';

@modelOptions({
  schemaOptions: {
    timestamps: true, // Automatically add `createdAt` and `updatedAt` fields
  },
  options: {
    allowMixed: Severity.ALLOW, // Allow mixed types for metadata
  },
})
export class Notification extends Model {
  @Field(() => String) // GraphQL exposes `_id` as a string
  readonly _id!: mongoose.Types.ObjectId; // Mongoose-compatible ObjectId

  @prop({ required: true })
  type!: NotificationType;

  @prop({ type: mongoose.Schema.Types.Mixed, required: true })
  metadata!:
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
  @prop({ required: true })
  createdAt!: Date;

  @Field(() => Date)
  @prop({ required: true })
  updatedAt!: Date;
}

export const NotificationModel = getModelForClass(Notification);
