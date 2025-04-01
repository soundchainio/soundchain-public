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

  @Field()
  @prop({ required: true })
  owner!: string;

  @Field()
  @prop({ required: true })
  nft!: string;

  @Field()
  @prop({ required: true })
  tokenId!: number;

  @Field()
  @prop({ required: true })
  startingTime!: number;

  @Field()
  @prop({ required: true })
  endingTime!: number;

  @Field()
  @prop({ type: String, required: true })
  reservePrice!: string;

  @Field()
  @prop({ type: Number, required: true })
  reservePriceToShow!: number;

  @Field()
  @prop({ type: Boolean, required: true, default: false })
  isPaymentOGUN!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field()
  @prop({ default: true })
  valid!: boolean;

  @Field()
  @prop({ type: String })
  highestBid?: string;

  @Field()
  @prop({ type: Number })
  highestBidToShow?: number;

  @Field({ nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  trackId?: string;

  @Field({ nullable: true })
  @prop({ required: false })
  trackEditionId?: string;
}

export const AuctionItemModel = getModelForClass(AuctionItem);
