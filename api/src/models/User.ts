import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { DefaultWallet } from '../types/DefaultWallet';
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

  @Field({ nullable: true })
  @prop({ required: false })
  walletAddress: string;

  @Field(() => DefaultWallet)
  @prop({ type: String, enum: DefaultWallet, default: DefaultWallet.Soundchain })
  defaultWallet: DefaultWallet;

  @prop({ required: false })
  emailVerificationToken?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
