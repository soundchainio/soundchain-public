import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { AuthMethod } from '../types/AuthMethod';
import { DefaultWallet } from '../types/DefaultWallet';
import { Role } from '../types/Role';
import { Model } from './Model';

@ObjectType()
export class User extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => ID)
  @prop({ type: mongoose.Types.ObjectId, required: true })
  profileId: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  email: string;

  @Field(() => String)
  @prop({ required: true, unique: true })
  handle: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  magicWalletAddress: string;

  // OAuth-specific wallet addresses (each OAuth provider gives a unique wallet)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  googleWalletAddress?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  discordWalletAddress?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  twitchWalletAddress?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  emailWalletAddress?: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: [String], required: false })
  metaMaskWalletAddressees: string[];

  @Field(() => DefaultWallet)
  @prop({ type: String, enum: DefaultWallet, default: DefaultWallet.Soundchain })
  defaultWallet: DefaultWallet;

  @Field(() => AuthMethod)
  @prop({ type: String, enum: AuthMethod })
  authMethod: AuthMethod;

  @prop({ required: false })
  emailVerificationToken?: string;

  @Field(() => Boolean)
  @prop({ default: false })
  isApprovedOnMarketplace: boolean;

  @Field(() => [Role])
  @prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: string[];

  // Phone number for future notifications
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  phoneNumber?: string;

  // Notification preferences
  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnFollow?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnLike?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnComment?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnSale?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnTip?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyOnDM?: boolean;

  // Nostr pubkey for decentralized notifications via Bitchat/Nostr clients
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  nostrPubkey?: string;

  // Enable Nostr notifications (NIP-17 encrypted DMs)
  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: false })
  notifyViaNostr?: boolean;

  // OTP fields - stored in DB but not exposed to frontend (no @Field decorator)
  @prop({ required: false, default: undefined })
  otpSecret?: string;

  @prop({ required: false, default: undefined })
  otpRecoveryPhrase?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const UserModel = getModelForClass(User);
