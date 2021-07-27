import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import Model from './Model';

@modelOptions({ options: { customName: 'user_email_verification' } })
@ObjectType()
export default class UserEmailVerification extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  userId: string;

  @prop({ required: true })
  token: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserEmailVerificationModel = getModelForClass(UserEmailVerification);
