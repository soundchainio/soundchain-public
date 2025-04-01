import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Bid extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field()
  @prop({ required: true })
  nft: string;

  @Field()
  @prop({ required: true })
  tokenId: number;

  @Field()
  @prop({ required: true })
  bidder: string;

  @Field()
  @prop({ type: String, required: true })
  amount: string;

  @Field()
  @prop({ type: String, required: true })
  amountToShow: number;

  @Field()
  @prop({ type: mongoose.Types.ObjectId, required: true })
  auctionId: string;

  @Field()
  @prop({ type: mongoose.Types.ObjectId })
  profileId: string;

  @Field()
  @prop({ type: mongoose.Types.ObjectId })
  userId: string;

  @Field(() => Date)
  createdAt: Date;
}

export const BidModel = getModelForClass(Bid);
