import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field, ID } from 'type-graphql';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { DeletedCommentNotificationMetadata } from '../types/DeletedCommentNotificationMetadata';
import { DeletedPostNotificationMetadata } from '../types/DeletedPostNotificationMetadata';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NewVerificationRequestNotificationMetadata } from '../types/NewVerificationRequestNotificationMetadata';
import { NFTSoldNotificationMetadata } from '../types/NFTSoldNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';
import { TrackWithPriceMetadata } from '../types/TrackWithPriceMetadata';
import { VerificationRequestNotificationMetadata } from '../types/VerificationRequestNotificationMetadata';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @Field(() => ID) // Explicitly expose `_id` as a GraphQL ID type
  readonly _id!: ObjectId;

  @prop({ required: true })
  type: NotificationType;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @prop({ required: true })
  metadata:
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
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
