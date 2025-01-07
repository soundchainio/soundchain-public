import { getModelForClass, prop } from '@typegoose/typegoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { ObjectId } from 'mongodb';

@ObjectType()
export class AuctionItem {
  @Field(() => ID, { name: 'id' })
  readonly _id: ObjectId;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ required: false, default: false })
  isPaymentOGUN?: boolean; // Correct property for OGUN payments

  @Field(() => Date, { nullable: true })
  @prop()
  createdAt?: Date;

  @Field(() => Date, { nullable: true })
  @prop()
  updatedAt?: Date;
}

export const AuctionItemModel = getModelForClass(AuctionItem);
