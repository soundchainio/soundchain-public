import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class ProofBookItem extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop({ required: true })
  root: string;

  @Field(() => String)
  @prop({ required: true, unique: true })
  address: string;

  @Field(() => String)
  @prop({ required: true })
  value: string;

  @Field(() => [String], { nullable: false })
  @prop({ type: [String], required: true })
  merkleProof: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const ProofBookItemModel = getModelForClass(ProofBookItem);
