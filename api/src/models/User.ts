import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { AuthMethod } from '../types/AuthMethod';
import { DefaultWallet } from '../types/DefaultWallet';
import { Role } from '../types/Role';
import { Model } from './Model';

// HD Wallet System - Multi-chain support
export enum PrimaryWalletType {
  MAGIC = 'magic',
  HD = 'hd'
}

export enum MigrationStatus {
  NONE = 'none',
  PENDING = 'pending',
  COMPLETED = 'completed'
}

registerEnumType(PrimaryWalletType, { name: 'PrimaryWalletType' });
registerEnumType(MigrationStatus, { name: 'MigrationStatus' });

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

  // ============================================
  // HD WALLET SYSTEM - Multi-Chain Support
  // ============================================

  // HD-derived wallet address (works on ALL EVM chains: Polygon, Ethereum, Base, etc.)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  hdWalletAddress?: string;

  // When the HD wallet was generated
  @Field(() => Date, { nullable: true })
  @prop({ required: false })
  hdWalletCreatedAt?: Date;

  // Which wallet is primary for transactions
  @Field(() => PrimaryWalletType, { nullable: true })
  @prop({ type: String, enum: PrimaryWalletType, default: PrimaryWalletType.MAGIC })
  primaryWallet?: PrimaryWalletType;

  // Migration status from Magic wallet to HD wallet
  @Field(() => MigrationStatus, { nullable: true })
  @prop({ type: String, enum: MigrationStatus, default: MigrationStatus.NONE })
  migrationStatus?: MigrationStatus;

  // Transaction hash of the migration (NFT/token transfers)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  migrationTxHash?: string;

  // Solana address (different derivation path, non-EVM)
  @Field(() => String, { nullable: true })
  @prop({ required: false })
  solanaAddress?: string;

  // ============================================

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

  // Nostr private key (NOT exposed to GraphQL - server-side only for sending)
  // Auto-generated on registration for seamless decentralized notifications
  @prop({ required: false })
  nostrPrivateKey?: string;

  // Enable Nostr notifications (NIP-17 encrypted DMs)
  // Auto-enabled for new users with generated keypairs
  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: true })
  notifyViaNostr?: boolean;

  // WebAuthn user ID — opaque identifier for passkey registration (server-side only, no @Field)
  @prop({ required: false, unique: true, sparse: true })
  webauthnUserID?: string;

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
