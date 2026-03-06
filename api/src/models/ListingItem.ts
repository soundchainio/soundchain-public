import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Model } from './Model';

@InputType('ListingItemInput')
@ObjectType()
export class ListingItem extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  owner?: string;

  @Field(() => String, { nullable: true })
  nft?: string;

  @Field(() => Number, { nullable: true })
  tokenId?: number;

  @Field(() => String)
  contract!: string;

  @Field(() => Number, { nullable: true })
  startingTime?: number;

  @Field(() => Number, { nullable: true })
  endingTime?: number;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  reservePrice?: string;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  selectedCurrency?: string;

  @Field(() => Number, { nullable: true })
  @prop({ type: Number })
  reservePriceToShow?: number;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  pricePerItem?: string;

  @Field(() => Number, { nullable: true })
  @prop({ type: Number })
  pricePerItemToShow?: number;

  @Field(() => String, { nullable: true })
  @prop({ type: String })
  OGUNPricePerItem?: string;

  @Field(() => Number, { nullable: true })
  @prop({ type: Number })
  OGUNPricePerItemToShow?: number;

  @Field(() => Boolean, { nullable: true })
  @prop({ type: Boolean })
  acceptsMATIC?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ type: Boolean })
  acceptsOGUN?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ type: Boolean })
  isPaymentOGUN?: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export const ListingItemModel = getModelForClass(ListingItem);

@ObjectType()
export class ListingItemWithPrice extends ListingItem {
  @Field(() => Number, { nullable: true })
  @prop({ type: Number })
  priceToShow?: number;
}

export const ListingItemWithPriceModel = getModelForClass(ListingItemWithPrice);
