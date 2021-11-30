import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field } from 'type-graphql';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NewVerificationRequestNotificationMetadata } from '../types/NewVerificationRequestNotificationMetadata';
import { NFTSoldNotificationMetadata } from '../types/NFTSoldNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';
import { VerificationRequestNotificationMetadata } from '../types/VerificationRequestNotificationMetadata';
import { Model } from './Model';
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @prop({ required: true })
  type: NotificationType;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @prop({ required: true })
  metadata:
    | CommentNotificationMetadata
    | FollowerNotificationMetadata
    | ReactionNotificationMetadata
    | NewPostNotificationMetadata
    | NFTSoldNotificationMetadata
    | VerificationRequestNotificationMetadata
    | NewVerificationRequestNotificationMetadata;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
