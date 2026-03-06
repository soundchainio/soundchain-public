import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import mongoose from 'mongoose';
import { Model } from './Model';

@ObjectType()
export class AuctionItem extends Model {
  // Use an ObjectId to match the base Model
  // The GraphQL field will still appear as "id"
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ type: String, required: true })
  owner!: string;

  @Field(() => String)
  @prop({ required: true })
  nft!: string;

  @Field(() => Number)
  @prop({ required: true })
  tokenId!: number;

  @Field(() => Number)
  @prop({ required: true })
  startingTime!: number;

  @Field(() => Number)
  @prop({ required: true })
  endingTime!: number;

  @Field(() => String)
  @prop({ type: String, required: true })
  reservePrice!: string;

  @Field(() => Number)
  @prop({ type: Number, required: true })
  reservePriceToShow!: number;

  @Field(() => Boolean)
  @prop({ type: Boolean, required: true, default: false })
  isPaymentOGUN!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Boolean)
  @prop({ default: true })
  valid!: boolean;

  @Field(() => String)
  @prop({ type: String })
  highestBid?: string;

  @Field(() => Number)
  @prop({ type: Number })
  highestBidToShow?: number;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackId?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackEditionId?: string;
}

export const AuctionItemModel = getModelForClass(AuctionItem);
