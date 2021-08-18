import { getModelForClass, prop } from '@typegoose/typegoose';
import { NotificationType } from 'enums/NotificationType';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';

@ObjectType()
export class Notification extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field(() => NotificationType)
  @prop({ required: true })
  type: NotificationType;

  @Field({ nullable: true })
  @prop({ required: false })
  contentId: string;

  @Field({ nullable: true })
  @prop({ required: false })
  senderProfileId: string;

  @Field()
  @prop({ required: true })
  receiverProfileId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const NotificationModel = getModelForClass(Notification);
