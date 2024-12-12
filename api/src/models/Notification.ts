import { Field, ID } from 'type-graphql';
import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @Field(() => ID) // Exposes the `_id` field in GraphQL
  readonly _id: ObjectId;

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
