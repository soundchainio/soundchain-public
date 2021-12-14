import { getModelForClass, index, prop } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field, ID, ObjectType } from 'type-graphql';
import { DefaultWallet } from '../types/DefaultWallet';
import { Role } from '../types/Role';
import { Model } from './Model';
@index({ handle: 'text' })
@ObjectType()
export class User extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @prop({ type: ObjectId, required: true })
  profileId: string;

  @Field()
  @prop({ required: true })
  email: string;

  @Field()
  @prop({ required: true, unique: true })
  handle: string;

  @Field({ nullable: true })
  @prop({ required: false })
  magicWalletAddress: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: [String], required: false })
  metaMaskWalletAddressees: string[];

  @Field(() => DefaultWallet)
  @prop({ type: String, enum: DefaultWallet, default: DefaultWallet.Soundchain })
  defaultWallet: DefaultWallet;

  @prop({ required: false })
  emailVerificationToken?: string;

  @Field()
  @prop({ default: false })
  isApprovedOnMarketplace: boolean;

  @Field(() => [Role])
  @prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
