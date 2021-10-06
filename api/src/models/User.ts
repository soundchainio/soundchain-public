import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';
@ObjectType()
export class User extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  email: string;

  @Field()
  @prop({ required: true })
  handle: string;

  @prop({ required: false })
  password: string;

  @prop({ required: false })
  emailVerificationToken?: string;

  @Field()
  @prop({ required: true, default: false })
  verified: boolean;

  @prop({ required: false })
  passwordResetToken?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
