import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql'; // Added type-graphql imports
import { Model } from './Model';

@ObjectType() // Added for GraphQL compatibility
export class BlockTracker extends Model {
  @Field(() => ID, { name: 'id' }) // Added for GraphQL
  public override _id!: mongoose.Types.ObjectId;

  @Field() // Added for GraphQL
  @prop({ required: true })
  blockNumber: number;

  @Field(() => Date) // Added for consistency
  createdAt: Date;

  @Field(() => Date) // Added for consistency
  updatedAt: Date;
}

export const BlockTrackerModel = getModelForClass(BlockTracker);
