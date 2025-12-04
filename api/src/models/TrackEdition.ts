import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { EditionData } from '../types/EditionData';
import { Model } from './Model';

@ObjectType()
export class TrackEdition extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String)
  @prop()
  transactionHash: string;

  @Field(() => Number)
  @prop()
  editionId: number;

  @Field(() => Boolean)
  @prop({ default: false })
  listed: boolean;

  @Field(() => String, { nullable: true })
  @prop({ required: false })
  contract?: string;

  @Field(() => String)
  @prop({ required: false, default: '' })
  marketplace: string;

  @Field(() => EditionData, { nullable: true })
  @prop()
  editionData?: EditionData;

  @Field(() => Number)
  @prop()
  editionSize: number;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const TrackEditionModel = getModelForClass(TrackEdition);
