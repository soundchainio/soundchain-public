import { getModelForClass, prop } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class Bid extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

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
  @prop({ required: true })
  amount: number;

  @Field()
  @prop({ type: ObjectId, required: true })
  auctionId: string;

  @Field(() => Date)
  createdAt: Date;
}

export const BidModel = getModelForClass(Bid);
