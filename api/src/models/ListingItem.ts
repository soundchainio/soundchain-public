import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class ListingItem extends Model {
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
  quantity: number;

  @Field()
  @prop({ required: true })
  pricePerItem: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field()
  @prop({ default: true })
  valid: boolean;
}

export const ListingItemModel = getModelForClass(ListingItem);
