import { getModelForClass, prop } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';
@ObjectType()
export class ProofBookItem extends Model {
  @Field(() => ID, { name: 'id' })
  readonly _id: string;

  @Field()
  @prop({ required: true })
  root: string;

  @Field()
  @prop({ required: true, unique: true })
  address: string;

  @Field()
  @prop({ required: true })
  value: string;

  @Field(() => [String], { nullable: false })
  @prop({ type: [String], required: true })
  merkleProof: string[];
}

export const ProofBookItemModel = getModelForClass(ProofBookItem);
