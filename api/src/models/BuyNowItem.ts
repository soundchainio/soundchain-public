import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Types } from 'mongoose';
import { Model } from './Model';

@ObjectType()
export class BuyNowItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id!: Types.ObjectId; // MongoDB ObjectId compatibility

  @Field(() => String)
  @prop({ required: true })
  owner!: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackId?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  trackEditionId?: string;

  @Field(() => Number)
  @prop({ required: true })
  tokenId!: number;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  selectedCurrency?: string;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field(() => Number)
  @prop({ required: true })
  startingTime!: number;

  @Field(() => String)
  @prop({ required: true })
  pricePerItem!: string;

  @Field(() => Number)
  @prop({ required: true })
  pricePerItemToShow!: number;

  @Field(() => String)
  @prop({ required: true })
  OGUNPricePerItem!: string;

  @Field(() => Number)
  @prop({ required: true })
  OGUNPricePerItemToShow!: number;

  @Field(() => Boolean)
  @prop({ required: true })
  acceptsMATIC!: boolean;

  @Field(() => Boolean)
  @prop({ required: true })
  acceptsOGUN!: boolean;

  @Field(() => Date)
  @prop({ required: true })
  createdAt!: Date;

  @Field(() => Date)
  @prop({ required: true })
  updatedAt!: Date;

  @Field(() => Boolean)
  @prop({ default: true })
  valid!: boolean;
}

export const BuyNowItemModel = getModelForClass(BuyNowItem);
