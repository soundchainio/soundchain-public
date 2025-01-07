import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Types } from 'mongoose';
import { Model } from './Model';

@ObjectType()
export class AuctionItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: Types.ObjectId; // Use the correct ObjectId type from mongoose

  @Field(() => String)
  @prop({ required: true })
  owner!: string;

  @Field(() => String)
  @prop({ required: true })
  nft!: string;

  @Field(() => Number)
  @prop({ required: true })
  tokenId!: number;

  @Field(() => Number)
  @prop({ required: true })
  startingPrice!: number;

  @Field(() => Number)
  @prop({ required: true })
  ending!: number;

  @Field(() => String)
  @prop({ required: true })
  reservePrice!: string;

  @Field(() => Number)
  @prop({ required: true })
  reservePriceToShow!: number;

  @Field(() => Boolean)
  @prop({ required: true, default: false })
  isPaymentOGUN?: boolean;

  @Field(() => Date)
  @prop()
  createdAt!: Date;

  @Field(() => Date)
  @prop()
  updatedAt!: Date;

  @Field(() => Boolean)
  @prop()
  valid!: boolean;

  @Field(() => String)
  @prop()
  highestBid!: string;

  @Field(() => Number)
  @prop()
  highestBidToShow!: number;

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
