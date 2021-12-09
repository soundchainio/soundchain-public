import { getModelForClass, prop } from '@typegoose/typegoose';
import { Double } from 'mongodb';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class ListingItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field({ nullable: true })
  owner: string;

  @Field({ nullable: true })
  nft: string;

  @Field({ nullable: true })
  tokenId: number;

  @Field({ nullable: true })
  startingTime: number;

  @Field({ nullable: true })
  endingTime: number;

  @Field({ nullable: true })
  @prop({ type: Double })
  reservePrice: number;

  @Field({ nullable: true })
  @prop({ type: Double })
  pricePerItem: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ListingItemModel = getModelForClass(ListingItem);

@ObjectType()
export class ListingItemWithPrice extends ListingItem {
  @Field({ nullable: true })
  @prop({ type: Double })
  priceToShow: number;
}

export const ListingItemWithPriceModel = getModelForClass(ListingItemWithPrice);
