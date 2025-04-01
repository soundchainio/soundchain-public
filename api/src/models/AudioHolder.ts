import { getModelForClass, prop } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { Field, ID, ObjectType } from 'type-graphql';
import { Model } from './Model';

@ObjectType()
export class AudioHolder extends Model {
  @Field(() => ID, { name: 'id' })
  public override _id!: mongoose.Types.ObjectId;

  @Field({ nullable: false })
  @prop({ required: true })
  walletAddress: string;

  @Field({ nullable: false })
  @prop({ required: true })
  amount: number; // Changed from string to number to match NewAudioHolderParams

  @Field({ nullable: true })
  @prop({ default: false })
  ogunClaimed?: boolean;

  @Field(() => Date) // Added for consistency with other models
  createdAt: Date;

  @Field(() => Date) // Added for consistency with other models
  updatedAt: Date;
}

export const AudioHolderModel = getModelForClass(AudioHolder);
