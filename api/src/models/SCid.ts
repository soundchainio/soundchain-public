/**
 * SCid (SoundChain ID) Model
 *
 * Stores registered SCids for tracks on the SoundChain platform.
 * Acts as a decentralized registry for Web3 music identification.
 */

import { getModelForClass, modelOptions, prop, Severity, index } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import { Model } from './Model';
import { ChainCode } from '../utils/SCidGenerator';

// Register ChainCode enum for GraphQL
registerEnumType(ChainCode, {
  name: 'ChainCode',
  description: 'Blockchain network codes for SCid',
});

export enum SCidStatus {
  PENDING = 'PENDING',           // Generated but not yet on-chain
  REGISTERED = 'REGISTERED',     // Registered on-chain
  TRANSFERRED = 'TRANSFERRED',   // Ownership transferred
  REVOKED = 'REVOKED',          // Revoked (rare, for disputes)
}

registerEnumType(SCidStatus, {
  name: 'SCidStatus',
  description: 'Status of SCid registration',
});

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    timestamps: true,
    collection: 'scids',
  },
})
@ObjectType()
@index({ scid: 1 }, { unique: true })
@index({ trackId: 1 })
@index({ profileId: 1 })
@index({ artistHash: 1 })
@index({ chainCode: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
export class SCid extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  /**
   * The SCid code itself (e.g., SC-POL-7B3A-2400001)
   */
  @Field(() => String)
  @prop({ required: true, unique: true })
  scid: string;

  /**
   * Reference to the Track this SCid is assigned to
   */
  @Field(() => String)
  @prop({ required: true })
  trackId: string;

  /**
   * Reference to the Profile (artist) who owns this SCid
   */
  @Field(() => String)
  @prop({ required: true })
  profileId: string;

  /**
   * Artist's wallet address at time of registration
   */
  @Field(() => String, { nullable: true })
  @prop()
  walletAddress?: string;

  /**
   * Blockchain this SCid is registered on
   */
  @Field(() => ChainCode)
  @prop({ required: true, enum: Object.values(ChainCode), type: String })
  chainCode: ChainCode;

  /**
   * Chain ID for the blockchain
   */
  @Field(() => Number, { nullable: true })
  @prop()
  chainId?: number;

  /**
   * Artist hash component of the SCid
   */
  @Field(() => String)
  @prop({ required: true })
  artistHash: string;

  /**
   * Year component of the SCid
   */
  @Field(() => String)
  @prop({ required: true })
  year: string;

  /**
   * Sequence number component
   */
  @Field(() => Number)
  @prop({ required: true })
  sequence: number;

  /**
   * Registration status
   */
  @Field(() => SCidStatus)
  @prop({ required: true, enum: SCidStatus, default: SCidStatus.PENDING })
  status: SCidStatus;

  /**
   * On-chain transaction hash (when registered)
   */
  @Field(() => String, { nullable: true })
  @prop()
  transactionHash?: string;

  /**
   * Block number where SCid was registered
   */
  @Field(() => Number, { nullable: true })
  @prop()
  blockNumber?: number;

  /**
   * Smart contract address where SCid is registered
   */
  @Field(() => String, { nullable: true })
  @prop()
  contractAddress?: string;

  /**
   * IPFS hash of track metadata
   */
  @Field(() => String, { nullable: true })
  @prop()
  metadataHash?: string;

  /**
   * Checksum for SCid verification
   */
  @Field(() => String, { nullable: true })
  @prop()
  checksum?: string;

  /**
   * Total stream count for OGUN rewards
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  streamCount: number;

  /**
   * Total OGUN rewards earned by this track
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  ogunRewardsEarned: number;

  /**
   * Last stream timestamp
   */
  @Field(() => Date, { nullable: true })
  @prop()
  lastStreamAt?: Date;

  /**
   * Daily OGUN earned (resets each day, anti-bot farming)
   */
  @Field(() => Number)
  @prop({ required: true, default: 0 })
  dailyOgunEarned: number;

  /**
   * Last daily reset date
   */
  @Field(() => Date, { nullable: true })
  @prop()
  lastDailyReset?: Date;

  /**
   * Previous owner (for transfers)
   */
  @Field(() => String, { nullable: true })
  @prop()
  previousOwnerId?: string;

  /**
   * Transfer history
   */
  @prop({ type: () => [SCidTransfer], default: [] })
  transferHistory: SCidTransfer[];

  /**
   * Timestamps
   */
  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /**
   * On-chain registration timestamp
   */
  @Field(() => Date, { nullable: true })
  @prop()
  registeredAt?: Date;
}

/**
 * SCid Transfer record
 */
@ObjectType()
export class SCidTransfer {
  @Field(() => String)
  @prop({ required: true })
  fromProfileId: string;

  @Field(() => String)
  @prop({ required: true })
  toProfileId: string;

  @Field(() => String, { nullable: true })
  @prop()
  transactionHash?: string;

  @Field(() => Date)
  @prop({ required: true })
  transferredAt: Date;

  @Field(() => String, { nullable: true })
  @prop()
  reason?: string;
}

export const SCidModel = getModelForClass(SCid);

export default SCid;
