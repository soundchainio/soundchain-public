import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Model } from './Model';

@InputType('ListingItemInput')
@ObjectType()
export class ListingItem extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field({ nullable: true })
  owner?: string;

  @Field({ nullable: true })
  nft?: string;

  @Field({ nullable: true })
  tokenId?: number;

  @Field()
  contract!: string;

  @Field({ nullable: true })
  startingTime?: number;

  @Field({ nullable: true })
  endingTime?: number;

  @Field({ nullable: true })
  @prop({ type: String })
  reservePrice?: string;

  @Field({ nullable: true })
  @prop({ type: String })
  selectedCurrency?: string;

  @Field({ nullable: true })
  @prop({ type: Number })
  reservePriceToShow?: number;

  @Field({ nullable: true })
  @prop({ type: String })
  pricePerItem?: string;

  @Field({ nullable: true })
  @prop({ type: Number })
  pricePerItemToShow?: number;

  @Field({ nullable: true })
  @prop({ type: String })
  OGUNPricePerItem?: string;

  @Field({ nullable: true })
  @prop({ type: Number })
  OGUNPricePerItemToShow?: number;

  @Field({ nullable: true })
  @prop({ type: Boolean })
  acceptsMATIC?: boolean;

  @Field({ nullable: true })
  @prop({ type: Boolean })
  acceptsOGUN?: boolean;

  @Field({ nullable: true })
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
  @Field({ nullable: true })
  @prop({ type: Number })
  priceToShow?: number;
}

export const ListingItemWithPriceModel = getModelForClass(ListingItemWithPrice);
