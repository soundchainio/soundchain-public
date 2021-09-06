import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Message extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  fromId: string;

  @Field()
  @prop({ required: true })
  toId: string;

  @Field()
  @prop({ required: true })
  message: string;

  @Field(() => [String])
  @prop({ required: true })
  readProfileIds: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const MessageModel = getModelForClass(Message);
