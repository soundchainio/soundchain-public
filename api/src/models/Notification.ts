import { getModelForClass, prop } from '@typegoose/typegoose';
import { NotificationType } from 'enums/NotificationType';
import { Field, ID, ObjectType } from 'type-graphql';
import { CommentNotificationMetadata } from './CommentNotification';
import { Model } from './Model';

@ObjectType()
export class Notification extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field(() => NotificationType)
  @prop({ required: true })
  type: NotificationType;

  @Field()
  @prop({ required: true })
  profileId: string;

  @prop({ required: true })
  metadata: CommentNotificationMetadata;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
