import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class BuyNowItem extends Model {
  // Use ObjectId for _id to match the base Model
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field()
  @prop({ required: true })
  owner: string;

  @Field({ nullable: true })
  @prop({ required: false })
  trackId?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  trackEditionId?: string;

  @Field()
  @prop({ required: true })
  nft: string;

  @Field()
  @prop({ required: true })
  tokenId: number;

  @Field({ nullable: true })
  @prop({ type: String })
  selectedCurrency: string;

  @Field({ nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field()
  @prop({ required: true })
  startingTime: number;

  @Field()
  @prop({ type: String, required: true })
  pricePerItem: string;

  @Field()
  @prop({ type: Number, required: true })
  pricePerItemToShow: number;

  @Field()
  @prop({ type: String, required: true })
  OGUNPricePerItem: string;

  @Field()
  @prop({ type: Number, required: true })
  OGUNPricePerItemToShow: number;

  @Field()
  @prop({ type: Boolean, required: true })
  acceptsMATIC: boolean;

  @Field()
  @prop({ type: Boolean, required: true })
  acceptsOGUN: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field()
  @prop({ default: true })
  valid: boolean;
}

export const BuyNowItemModel = getModelForClass(BuyNowItem);
