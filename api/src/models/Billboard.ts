/**
 * Billboard Model — OGUN-powered ad slots
 *
 * Users pay OGUN to promote their music, events, or brand on
 * SoundChain billboard slots (feed, radio, sidebar).
 * Billboards have a duration (1-7 days) and expire automatically.
 */

import { getModelForClass, modelOptions, prop, Severity, index } from '@typegoose/typegoose'
import mongoose from 'mongoose'
import { Field, ID, ObjectType, registerEnumType, Float, Int } from 'type-graphql'
import { Model } from './Model'

export enum BillboardStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
  PENDING = 'PENDING',
}

export enum BillboardSlot {
  FEED_TOP = 'FEED_TOP',
  SIDEBAR_1 = 'SIDEBAR_1',
  SIDEBAR_2 = 'SIDEBAR_2',
  RADIO = 'RADIO',
  EXPLORE = 'EXPLORE',
  USERS = 'USERS',
}

registerEnumType(BillboardStatus, {
  name: 'BillboardStatus',
  description: 'Status of a billboard ad',
})

registerEnumType(BillboardSlot, {
  name: 'BillboardSlot',
  description: 'Available billboard placement slots',
})

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    timestamps: true,
    collection: 'billboards',
  },
})
@ObjectType()
@index({ status: 1, slot: 1 })
@index({ profileId: 1 })
@index({ expiresAt: 1 })
@index({ slot: 1, status: 1, expiresAt: -1 })
export class Billboard extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId

  /** Profile that purchased the billboard */
  @Field(() => String)
  @prop({ required: true })
  profileId: string

  /** Which slot this billboard occupies */
  @Field(() => BillboardSlot)
  @prop({ required: true, enum: BillboardSlot })
  slot: BillboardSlot

  /** Billboard headline text */
  @Field(() => String)
  @prop({ required: true, maxlength: 100 })
  title: string

  /** Billboard description/body */
  @Field(() => String, { nullable: true })
  @prop({ maxlength: 280 })
  description?: string

  /** Image URL (IPFS or external) */
  @Field(() => String, { nullable: true })
  @prop()
  imageUrl?: string

  /** Click-through URL */
  @Field(() => String, { nullable: true })
  @prop()
  linkUrl?: string

  /** OGUN amount paid */
  @Field(() => Float)
  @prop({ required: true })
  ogunPaid: number

  /** Duration in days (1, 3, or 7) */
  @Field(() => Int)
  @prop({ required: true, min: 1, max: 7 })
  durationDays: number

  /** On-chain transaction hash for the OGUN payment */
  @Field(() => String, { nullable: true })
  @prop()
  txHash?: string

  /** Billboard status */
  @Field(() => BillboardStatus)
  @prop({ required: true, enum: BillboardStatus, default: BillboardStatus.PENDING })
  status: BillboardStatus

  /** When the billboard goes live */
  @Field(() => Date)
  @prop({ required: true })
  startsAt: Date

  /** When the billboard expires */
  @Field(() => Date)
  @prop({ required: true })
  expiresAt: Date

  /** Impressions counter */
  @Field(() => Int)
  @prop({ default: 0 })
  impressions: number

  /** Click counter */
  @Field(() => Int)
  @prop({ default: 0 })
  clicks: number
}

export const BillboardModel = getModelForClass(Billboard)
