import { getModelForClass } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class ListingItemView extends Model {
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
  reservePrice: string;

  @Field({ nullable: true })
  pricePerItem: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ListingItemModel = getModelForClass(ListingItemView);
