import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class BuyNowItem extends Model {
  // Use ObjectId for _id to match the base Model
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  owner: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackId?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackEditionId?: string;

  @Field(() => String)
  @prop({ required: true })
  nft: string;

  @Field(() => Number)
  @prop({ required: true })
  tokenId: number;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  selectedCurrency: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field(() => Number)
  @prop({ required: true })
  startingTime: number;

  @Field(() => String)
  @prop({ type: String, required: true })
  pricePerItem: string;

  @Field(() => Number)
  @prop({ type: Number, required: true })
  pricePerItemToShow: number;

  @Field(() => String)
  @prop({ type: String, required: true })
  OGUNPricePerItem: string;

  @Field(() => Number)
  @prop({ type: Number, required: true })
  OGUNPricePerItemToShow: number;

  @Field(() => Boolean)
  @prop({ type: Boolean, required: true })
  acceptsMATIC: boolean;

  @Field(() => Boolean)
  @prop({ type: Boolean, required: true })
  acceptsOGUN: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Boolean)
  @prop({ default: true })
  valid: boolean;
}

export const BuyNowItemModel = getModelForClass(BuyNowItem);
