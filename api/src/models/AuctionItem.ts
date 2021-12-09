import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class AuctionItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  owner: string;

  @Field()
  @prop({ required: true })
  nft: string;

  @Field()
  @prop({ required: true })
  tokenId: number;

  @Field()
  @prop({ required: true })
  startingTime: number;

  @Field()
  @prop({ required: true })
  endingTime: number;

  @Field()
  @prop({ required: true })
  reservePrice: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field()
  @prop({ default: true })
  valid: boolean;

  @Field()
  @prop()
  highestBid: string;
}

export const AuctionItemModel = getModelForClass(AuctionItem);
