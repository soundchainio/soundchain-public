import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class LogError extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field(() => String, { nullable: true })
  @prop()
  title: string;

  @Field(() => String, { nullable: true })
  @prop()
  description: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

export const LogErrorModel = getModelForClass(LogError);
