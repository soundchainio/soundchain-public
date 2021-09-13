import { getModelForClass, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { Field } from 'type-graphql';
import { CommentNotificationMetadata } from '../types/CommentNotificationMetadata';
import { FollowerNotificationMetadata } from '../types/FollowerNotificationMetadata';
import { NewPostNotificationMetadata } from '../types/NewPostNotificationMetadata';
import { NotificationType } from '../types/NotificationType';
import { ReactionNotificationMetadata } from '../types/ReactionNotificationMetadata';
import { Model } from './Model';

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Notification extends Model {
  @prop({ required: true })
  type: NotificationType;

  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  metadata:
    | CommentNotificationMetadata
    | FollowerNotificationMetadata
    | ReactionNotificationMetadata
    | NewPostNotificationMetadata;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
